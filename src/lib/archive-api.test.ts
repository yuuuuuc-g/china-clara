import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ArchiveApiError,
  deleteDocument,
  listDocuments,
  listTopics,
  saveAnalyticalDocument,
  type SaveAnalyticalDocumentInput,
} from "./archive-api";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

function baseSaveInput(): SaveAnalyticalDocumentInput {
  return {
    content: "  final analysis  ",
    sourceIssue: "why supply chains shifted",
    archives: { A: "a-text", B: "b-text", C: "c-text" },
    selectedItems: { A: { k1: "v1" }, B: {}, C: { k2: "v2" } },
    customTags: ["macro", "apac"],
    topicId: null,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("archive-api read helpers", () => {
  it("unwraps the topics envelope", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ topics: [{ id: "t1", title: "T" }] }));

    await expect(listTopics()).resolves.toEqual([{ id: "t1", title: "T" }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/topics", undefined);
  });

  it("unwraps the documents envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ documents: [{ id: "d1" }] })
    );

    await expect(listDocuments()).resolves.toEqual([{ id: "d1" }]);
  });

  it("issues a DELETE for a document id", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));

    await deleteDocument("d1");
    expect(fetchMock).toHaveBeenCalledWith("/api/archive/d1", { method: "DELETE" });
  });

  it("throws ArchiveApiError with the server message on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "Nope." }, { ok: false, status: 404 })
    );

    await expect(listTopics()).rejects.toMatchObject({
      name: "ArchiveApiError",
      status: 404,
      message: "Nope.",
    });
  });
});

describe("saveAnalyticalDocument", () => {
  it("posts the trimmed content and phases, mapping create -> created", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        document: { id: "doc-1" },
        topic: { id: "topic-1", title: "T" },
        mode: "create",
      })
    );

    const result = await saveAnalyticalDocument(baseSaveInput());

    expect(result).toEqual({
      type: "created",
      documentId: "doc-1",
      topic: { id: "topic-1", title: "T" },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analytical-pipeline/archive");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      content: "final analysis",
      sourceText: "why supply chains shifted",
      phases: {
        a: { archive: "a-text", selected_items: { k1: "v1" } },
        b: { archive: "b-text", selected_items: {} },
        c: { archive: "c-text", selected_items: { k2: "v2" }, custom_tags: ["macro", "apac"] },
      },
    });
    expect(body).not.toHaveProperty("selectedTopicId");
  });

  it("maps append -> appended and echoes the topic id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ document: { id: "doc-2" }, topic: null, mode: "append" })
    );

    const result = await saveAnalyticalDocument({
      ...baseSaveInput(),
      topicId: "topic-9",
    });

    expect(result).toEqual({ type: "appended", documentId: "doc-2", topicId: "topic-9" });
  });

  it("rejects empty content before calling the network", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      saveAnalyticalDocument({ ...baseSaveInput(), content: "   " })
    ).rejects.toBeInstanceOf(ArchiveApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
