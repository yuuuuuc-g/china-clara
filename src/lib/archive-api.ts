import type { Database, Json } from "@/src/lib/database.types";
import type {
  AnalyticalArchives,
  SelectedItemsByPhase,
} from "@/src/modules/refinery/session";

/**
 * Browser-side client for the Archive.
 *
 * All persistence goes through the server-side, service-role API routes
 * (`/api/topics`, `/api/archive`, `/api/analytical-pipeline/archive`). The
 * browser never talks to Supabase directly, so no anon-key client is needed
 * and the database is never exposed to unauthenticated callers.
 */

export type ArchiveTopic = Database["public"]["Tables"]["topics"]["Row"];
export type ArchiveDocument = Database["public"]["Tables"]["documents"]["Row"];

export interface SaveAnalyticalDocumentInput {
  content: string;
  sourceIssue: string;
  archives: AnalyticalArchives;
  selectedItems: SelectedItemsByPhase;
  customTags: string[];
  topicId: string | null;
}

export type SaveAnalyticalDocumentResult =
  | { type: "created"; documentId: string; topic: ArchiveTopic }
  | { type: "appended"; documentId: string; topicId: string };

export class ArchiveApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ArchiveApiError";
  }
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ArchiveApiError(
      payload?.error ?? `Request to ${input} failed.`,
      response.status
    );
  }

  return (await response.json()) as T;
}

export async function listTopics(): Promise<ArchiveTopic[]> {
  const { topics } = await requestJson<{ topics: ArchiveTopic[] }>("/api/topics");
  return topics;
}

export async function listDocuments(): Promise<ArchiveDocument[]> {
  const { documents } = await requestJson<{ documents: ArchiveDocument[] }>("/api/archive");
  return documents;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await requestJson<{ ok: true }>(`/api/archive/${documentId}`, { method: "DELETE" });
}

function buildAnalyticalSessionPhases(input: SaveAnalyticalDocumentInput): Record<string, Json> {
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

interface PersistAnalyticalArchiveResponse {
  document: { id: string };
  topic: ArchiveTopic | null;
  mode: "append" | "create";
}

export async function saveAnalyticalDocument(
  input: SaveAnalyticalDocumentInput
): Promise<SaveAnalyticalDocumentResult> {
  const content = input.content.trim();
  if (!content) {
    throw new ArchiveApiError("Document content is empty.", 400);
  }

  const result = await requestJson<PersistAnalyticalArchiveResponse>(
    "/api/analytical-pipeline/archive",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        sourceText: input.sourceIssue,
        selectedTopicId: input.topicId ?? undefined,
        phases: buildAnalyticalSessionPhases(input),
      }),
    }
  );

  if (result.mode === "create") {
    if (!result.topic) {
      throw new ArchiveApiError("Server did not return the created topic.", 502);
    }
    return { type: "created", documentId: result.document.id, topic: result.topic };
  }

  return {
    type: "appended",
    documentId: result.document.id,
    topicId: input.topicId ?? "",
  };
}
