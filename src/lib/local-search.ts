import OpenAI from "openai";

export const EMBEDDING_MODEL = "BAAI/bge-m3";

export interface SearchResult {
  id: string;
  content: string;
  chapter_title: string;
  similarity: number;
  chapter_index: number | null;
  chunk_index: number | null;
}

export interface HybridSearchRpcClient {
  rpc(
    fn: "hybrid_search",
    args: {
      query_text: string;
      query_embedding: number[];
      match_count: number;
      book_uuid_param: string | null;
    }
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

interface SearchChunksRow {
  id?: unknown;
  content?: unknown;
  chapter_title?: unknown;
  similarity?: unknown;
  chapter_index?: unknown;
  chunk_index?: unknown;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeSearchResult(row: SearchChunksRow): SearchResult | null {
  if (typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    content: typeof row.content === "string" ? row.content : "",
    chapter_title: typeof row.chapter_title === "string" ? row.chapter_title : "Unknown Chapter",
    similarity: nullableNumber(row.similarity) ?? 0,
    chapter_index: nullableNumber(row.chapter_index),
    chunk_index: nullableNumber(row.chunk_index),
  };
}

function isSearchResult(value: SearchResult | null): value is SearchResult {
  return value !== null;
}

async function createQueryEmbedding(embeddingClient: OpenAI, query: string): Promise<number[]> {
  const embeddingResponse = await embeddingClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0]?.embedding;

  if (!queryEmbedding) {
    throw new Error("Embedding provider returned no vector.");
  }

  return queryEmbedding;
}

export async function runLocalHybridSearch(params: {
  supabase: HybridSearchRpcClient;
  embeddingClient: OpenAI;
  query: string;
  matchCount: number;
  bookUuid?: string;
}): Promise<SearchResult[]> {
  const queryEmbedding = await createQueryEmbedding(params.embeddingClient, params.query);
  const { data, error } = await params.supabase.rpc("hybrid_search", {
    query_text: params.query,
    query_embedding: queryEmbedding,
    match_count: params.matchCount,
    book_uuid_param: params.bookUuid && params.bookUuid.length > 0 ? params.bookUuid : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? (data as SearchChunksRow[]) : [];
  return rows.map(normalizeSearchResult).filter(isSearchResult).slice(0, params.matchCount);
}
