import type { Database, Json } from "@/src/lib/database.types";

export type ArchiveDocument = Database["public"]["Tables"]["documents"]["Row"];
type TopicRow = Database["public"]["Tables"]["topics"]["Row"];
export type ArchiveTopic = Pick<TopicRow, "id" | "title" | "description"> &
  Partial<Pick<TopicRow, "created_at" | "updated_at">>;

export type AnalyticalArchives = Record<"A" | "B" | "C", string>;
export type AnalyticalSelectedItems = Record<"A" | "B" | "C", Record<string, string>>;

export interface SaveAnalyticalDocumentInput {
  content: string;
  sourceIssue: string;
  archives: AnalyticalArchives;
  selectedItems: AnalyticalSelectedItems;
  customTags: string[];
  topicId: string | null;
}

export type SaveAnalyticalDocumentResult =
  | {
      type: "created";
      documentId: string;
      topic: ArchiveTopic;
    }
  | {
      type: "appended";
      documentId: string;
      topicId: string;
    };

export interface ArchivePersistence {
  listTopics(): Promise<ArchiveTopic[]>;
  listDocuments(): Promise<ArchiveDocument[]>;
  deleteDocument(documentId: string): Promise<void>;
  saveAnalyticalDocument(
    input: SaveAnalyticalDocumentInput
  ): Promise<SaveAnalyticalDocumentResult>;
}

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface SupabaseResult<T> {
  data: T;
  error: SupabaseError | null;
}

interface OrderedSelectQuery<T> {
  order(column: string, options: { ascending: boolean }): Promise<SupabaseResult<T[] | null>>;
}

interface ExistingDocument {
  id: string;
  content_markdown: string | null;
}

interface ExistingDocumentQuery {
  eq(column: "topic_id", value: string): {
    order(column: "updated_at", options: { ascending: boolean }): {
      limit(count: number): {
        maybeSingle(): Promise<SupabaseResult<ExistingDocument | null>>;
      };
    };
  };
}

interface UpdatedDocumentQuery {
  eq(column: "id", value: string): {
    eq(column: "topic_id", value: string): {
      select(columns: "id"): {
        single(): Promise<SupabaseResult<Pick<ArchiveDocument, "id"> | null>>;
      };
    };
  };
}

interface InsertDocumentQuery {
  select(): {
    single(): Promise<SupabaseResult<ArchiveDocument | null>>;
  };
}

interface InsertTopicQuery {
  select(): {
    single(): Promise<SupabaseResult<ArchiveTopic | null>>;
  };
}

interface DeleteByIdQuery {
  eq(column: string, value: string): Promise<SupabaseResult<null>>;
}

interface TopicsTable {
  select(columns: "id, title, description"): OrderedSelectQuery<ArchiveTopic>;
  insert(input: {
    title: string;
    description: string | null;
  }): InsertTopicQuery;
}

interface DocumentsTable {
  select(columns: "*"): OrderedSelectQuery<ArchiveDocument>;
  select(columns: "id, content_markdown"): ExistingDocumentQuery;
  insert(input: {
    title: string;
    content_markdown: string;
    source_module: "analytical-pipeline";
    topic_id: string;
  }): InsertDocumentQuery;
  update(input: { content_markdown: string }): UpdatedDocumentQuery;
  delete(): DeleteByIdQuery;
}

interface AnalyticalSessionsTable {
  insert(input: {
    document_id: string;
    source_issue: string;
    phases: Json;
  }): Promise<SupabaseResult<null>>;
  delete(): DeleteByIdQuery;
}

export interface ArchiveSupabaseClient {
  from(table: "topics"): TopicsTable;
  from(table: "documents"): DocumentsTable;
  from(table: "analytical_sessions"): AnalyticalSessionsTable;
}

export class ArchivePersistenceError extends Error {
  constructor(
    message: string,
    readonly causeDetail?: SupabaseError
  ) {
    super(causeDetail?.message ? `${message}: ${causeDetail.message}` : message);
    this.name = "ArchivePersistenceError";
  }
}

export function createSupabaseArchivePersistence(
  supabaseClient: unknown
): ArchivePersistence {
  const supabase = supabaseClient as ArchiveSupabaseClient;

  return {
    async listTopics() {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, description")
        .order("updated_at", { ascending: false });

      failIfError("Load topics failed", error);
      return data ?? [];
    },

    async listDocuments() {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      failIfError("Load documents failed", error);
      return data ?? [];
    },

    async deleteDocument(documentId) {
      const { error: sessionError } = await supabase
        .from("analytical_sessions")
        .delete()
        .eq("document_id", documentId);

      failIfError("Delete analytical sessions failed", sessionError);

      const { error: documentError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      failIfError("Delete document failed", documentError);
    },

    async saveAnalyticalDocument(input) {
      const content = input.content.trim();
      if (!content) {
        throw new ArchivePersistenceError("Document content is empty.");
      }

      if (input.topicId) {
        return appendAnalyticalDocumentToTopic(supabase, {
          ...input,
          content,
          topicId: input.topicId,
        });
      }

      return createAnalyticalDocumentInNewTopic(supabase, {
        ...input,
        content,
      });
    },
  };
}

async function appendAnalyticalDocumentToTopic(
  supabase: ArchiveSupabaseClient,
  input: SaveAnalyticalDocumentInput & { topicId: string }
): Promise<SaveAnalyticalDocumentResult> {
  const { data: existingDoc, error: fetchError } = await supabase
    .from("documents")
    .select("id, content_markdown")
    .eq("topic_id", input.topicId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  failIfError("Fetch topic document failed", fetchError);

  if (!existingDoc) {
    throw new ArchivePersistenceError(
      `No existing document found for topic_id ${input.topicId}.`
    );
  }

  const updatedContent = `${existingDoc.content_markdown ?? ""}\n\n---\n\n${input.content}`;
  const { error: updateError } = await supabase
    .from("documents")
    .update({ content_markdown: updatedContent })
    .eq("id", existingDoc.id)
    .eq("topic_id", input.topicId)
    .select("id")
    .single();

  failIfError("Update document failed", updateError);

  await insertAnalyticalSession(supabase, existingDoc.id, input);

  return {
    type: "appended",
    documentId: existingDoc.id,
    topicId: input.topicId,
  };
}

async function createAnalyticalDocumentInNewTopic(
  supabase: ArchiveSupabaseClient,
  input: SaveAnalyticalDocumentInput
): Promise<SaveAnalyticalDocumentResult> {
  const topicTitle = input.sourceIssue.trim().slice(0, 100) || "Untitled Topic";
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({
      title: topicTitle,
      description: null,
    })
    .select()
    .single();

  failIfError("Insert topic failed", topicError);

  if (!topic) {
    throw new ArchivePersistenceError("No topic returned after insert.");
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      title: input.sourceIssue.slice(0, 50) || "Untitled Analysis",
      content_markdown: input.content,
      source_module: "analytical-pipeline",
      topic_id: topic.id,
    })
    .select()
    .single();

  failIfError("Insert document failed", documentError);

  if (!document) {
    throw new ArchivePersistenceError("No document returned after insert.");
  }

  await insertAnalyticalSession(supabase, document.id, input);

  return {
    type: "created",
    documentId: document.id,
    topic,
  };
}

async function insertAnalyticalSession(
  supabase: ArchiveSupabaseClient,
  documentId: string,
  input: SaveAnalyticalDocumentInput
) {
  const { error } = await supabase.from("analytical_sessions").insert({
    document_id: documentId,
    source_issue: input.sourceIssue,
    phases: buildAnalyticalSessionPhases(input),
  });

  failIfError("Insert analytical session failed", error);
}

function buildAnalyticalSessionPhases(input: SaveAnalyticalDocumentInput): Json {
  return {
    a: { archive: input.archives.A, selected_items: input.selectedItems.A },
    b: { archive: input.archives.B, selected_items: input.selectedItems.B },
    c: {
      archive: input.archives.C,
      selected_items: input.selectedItems.C,
      custom_tags: input.customTags,
    },
  };
}

function failIfError(message: string, error: SupabaseError | null) {
  if (error) {
    throw new ArchivePersistenceError(message, error);
  }
}
