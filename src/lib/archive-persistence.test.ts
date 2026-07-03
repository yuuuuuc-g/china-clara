import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseArchivePersistence,
  type ArchiveDocument,
  type ArchiveSupabaseClient,
  type ArchiveTopic,
} from "@/src/lib/archive-persistence";

const sampleInput = {
  content: "Final markdown",
  sourceIssue: "跨境政策套利",
  archives: {
    A: "briefing archive",
    B: "event archive",
    C: "concept archive",
  },
  selectedItems: {
    A: { "A:0": "标题：Briefing" },
    B: { "B:0": "事件：Policy shift" },
    C: { "C:0": "词汇：Regulatory arbitrage" },
  },
  customTags: ["制度套利"],
  topicId: null,
};

function createMockClient() {
  const calls: string[] = [];
  const topics: ArchiveTopic[] = [
    {
      id: "topic-existing",
      title: "Existing",
      description: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    },
  ];
  const documents: ArchiveDocument[] = [
    {
      id: "document-existing",
      title: "Existing Document",
      content_markdown: "Existing content",
      source_module: "analytical-pipeline",
      topic_id: "topic-existing",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    },
  ];
  const sessions: unknown[] = [];

  const client = {
    from(table: "topics" | "documents" | "analytical_sessions") {
      if (table === "topics") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({ data: topics, error: null })),
          })),
          insert: vi.fn((input: { title: string; description: string | null }) => {
            calls.push("topics.insert");
            const topic: ArchiveTopic = {
              id: "topic-new",
              title: input.title,
              description: input.description,
              created_at: "2026-01-03",
              updated_at: "2026-01-03",
            };
            topics.unshift(topic);
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: topic, error: null })),
              })),
            };
          }),
        };
      }

      if (table === "documents") {
        return {
          select: vi.fn((columns: string) => {
            if (columns === "id, content_markdown") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({
                        data: documents[0]
                          ? {
                              id: documents[0].id,
                              content_markdown: documents[0].content_markdown,
                            }
                          : null,
                        error: null,
                      })),
                    })),
                  })),
                })),
              };
            }

            return {
              order: vi.fn(async () => ({ data: documents, error: null })),
            };
          }),
          insert: vi.fn((input: {
            title: string;
            content_markdown: string;
            source_module: "analytical-pipeline";
            topic_id: string;
          }) => {
            calls.push("documents.insert");
            const document: ArchiveDocument = {
              id: "document-new",
              title: input.title,
              content_markdown: input.content_markdown,
              source_module: input.source_module,
              topic_id: input.topic_id,
              created_at: "2026-01-03",
              updated_at: "2026-01-03",
            };
            documents.unshift(document);
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: document, error: null })),
              })),
            };
          }),
          update: vi.fn((input: { content_markdown: string }) => {
            calls.push("documents.update");
            if (documents[0]) {
              documents[0].content_markdown = input.content_markdown;
            }
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: { id: documents[0]?.id ?? "missing" },
                      error: null,
                    })),
                  })),
                })),
              })),
            };
          }),
          delete: vi.fn(() => ({
            eq: vi.fn(async () => {
              calls.push("documents.delete");
              return { data: null, error: null };
            }),
          })),
        };
      }

      return {
        insert: vi.fn((input: unknown) => {
          calls.push("sessions.insert");
          sessions.push(input);
          return Promise.resolve({ data: null, error: null });
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(async () => {
            calls.push("sessions.delete");
            return { data: null, error: null };
          }),
        })),
      };
    },
  } as ArchiveSupabaseClient;

  return { client, calls, documents, sessions };
}

describe("createSupabaseArchivePersistence", () => {
  it("creates a Topic, Document, and Analytical Session for a new Archive entry", async () => {
    const { client, calls, sessions } = createMockClient();
    const archive = createSupabaseArchivePersistence(client);

    const result = await archive.saveAnalyticalDocument(sampleInput);

    expect(result).toEqual({
      type: "created",
      documentId: "document-new",
      topic: expect.objectContaining({
        id: "topic-new",
        title: "跨境政策套利",
      }),
    });
    expect(calls).toEqual(["topics.insert", "documents.insert", "sessions.insert"]);
    expect(sessions[0]).toMatchObject({
      document_id: "document-new",
      source_issue: "跨境政策套利",
      phases: {
        a: { archive: "briefing archive", selected_items: sampleInput.selectedItems.A },
        b: { archive: "event archive", selected_items: sampleInput.selectedItems.B },
        c: {
          archive: "concept archive",
          selected_items: sampleInput.selectedItems.C,
          custom_tags: ["制度套利"],
        },
      },
    });
  });

  it("appends content to the latest Document for an existing Topic", async () => {
    const { client, calls, documents, sessions } = createMockClient();
    const archive = createSupabaseArchivePersistence(client);

    const result = await archive.saveAnalyticalDocument({
      ...sampleInput,
      topicId: "topic-existing",
    });

    expect(result).toEqual({
      type: "appended",
      documentId: "document-existing",
      topicId: "topic-existing",
    });
    expect(documents[0]?.content_markdown).toBe("Existing content\n\n---\n\nFinal markdown");
    expect(calls).toEqual(["documents.update", "sessions.insert"]);
    expect(sessions[0]).toMatchObject({ document_id: "document-existing" });
  });

  it("deletes Analytical Sessions before deleting the Document", async () => {
    const { client, calls } = createMockClient();
    const archive = createSupabaseArchivePersistence(client);

    await archive.deleteDocument("document-existing");

    expect(calls).toEqual(["sessions.delete", "documents.delete"]);
  });
});
