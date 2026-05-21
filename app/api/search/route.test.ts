import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  embeddingsCreate: vi.fn(),
  rpc: vi.fn(),
  openAIConstructor: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn(function OpenAIMock(config: unknown) {
    mocks.openAIConstructor(config);

    return {
      embeddings: {
        create: mocks.embeddingsCreate,
      },
    };
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((url: string, key: string) => {
    mocks.createClient(url, key);

    return {
      rpc: mocks.rpc,
    };
  }),
}));

async function postSearch(body: unknown) {
  const { POST } = await import("./route");

  return POST(
    new Request("http://localhost/api/search", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

describe("POST /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_KEY = "supabase-key";
  });

  it("rejects an empty query before calling external services", async () => {
    const response = await postSearch({ query: "   " });

    await expect(response.json()).resolves.toEqual({
      error: "A non-empty query string is required.",
    });
    expect(response.status).toBe(400);
    expect(mocks.embeddingsCreate).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON as an invalid query", async () => {
    const response = await postSearch("{not-json");

    await expect(response.json()).resolves.toEqual({
      error: "A non-empty query string is required.",
    });
    expect(response.status).toBe(400);
  });

  it("reports missing server environment before external calls", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await postSearch({ query: "制度如何影响合作？" });

    await expect(response.json()).resolves.toEqual({
      error: "Missing required environment variable: OPENROUTER_API_KEY",
    });
    expect(response.status).toBe(500);
    expect(mocks.openAIConstructor).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("embeds the query, calls search_chunks, and returns three typed results", async () => {
    mocks.embeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: "chunk-1",
          content: "规则降低交易成本。",
          chapter_title: "制度与合作",
          similarity: 0.91,
          chapter_index: 4,
          chunk_index: 2,
        },
        {
          id: "chunk-2",
          content: "专业化依赖可预期规则。",
          chapter_title: "分工",
          similarity: 0.82,
          chapter_index: 5,
          chunk_index: 1,
        },
        {
          id: "chunk-3",
          content: "产权界定冲突边界。",
          chapter_title: "产权",
          similarity: 0.73,
          chapter_index: 6,
          chunk_index: 7,
        },
        {
          id: "chunk-4",
          content: "extra",
          chapter_title: "Should not render",
          similarity: 0.1,
        },
      ],
      error: null,
    });

    const response = await postSearch({ query: "  规则如何促进合作？  " });

    await expect(response.json()).resolves.toEqual({
      results: [
        {
          id: "chunk-1",
          content: "规则降低交易成本。",
          chapter_title: "制度与合作",
          similarity: 0.91,
          chapter_index: 4,
          chunk_index: 2,
        },
        {
          id: "chunk-2",
          content: "专业化依赖可预期规则。",
          chapter_title: "分工",
          similarity: 0.82,
          chapter_index: 5,
          chunk_index: 1,
        },
        {
          id: "chunk-3",
          content: "产权界定冲突边界。",
          chapter_title: "产权",
          similarity: 0.73,
          chapter_index: 6,
          chunk_index: 7,
        },
      ],
    });
    expect(response.status).toBe(200);
    expect(mocks.openAIConstructor).toHaveBeenCalledWith({
      apiKey: "openrouter-key",
      baseURL: "https://openrouter.ai/api/v1",
    });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "supabase-key"
    );
    expect(mocks.embeddingsCreate).toHaveBeenCalledWith({
      model: "openai/text-embedding-3-small",
      input: "规则如何促进合作？",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("search_chunks", {
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 3,
      book_uuid: "dfd8559e-7f32-4bff-9b6e-c03da0d59a2d",
    });
  });

  it("handles an empty embedding response", async () => {
    mocks.embeddingsCreate.mockResolvedValue({ data: [] });

    const response = await postSearch({ query: "方法论个人主义是什么？" });

    await expect(response.json()).resolves.toEqual({
      error: "Embedding provider returned no vector.",
    });
    expect(response.status).toBe(502);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("surfaces Supabase RPC errors as gateway failures", async () => {
    mocks.embeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "search_chunks failed" },
    });

    const response = await postSearch({ query: "产权为何重要？" });

    await expect(response.json()).resolves.toEqual({
      error: "search_chunks failed",
    });
    expect(response.status).toBe(502);
  });
});
