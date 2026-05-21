import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const BOOK_UUID = "dfd8559e-7f32-4bff-9b6e-c03da0d59a2d";
const MATCH_COUNT = 3;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface SearchResult {
  id: string;
  content: string;
  chapter_title: string;
  similarity: number;
  chapter_index: number | null;
  chunk_index: number | null;
}

interface SearchRequestBody {
  query?: unknown;
}

interface SearchResponseBody {
  results: SearchResult[];
}

interface SearchChunksRow {
  id?: unknown;
  content?: unknown;
  chapter_title?: unknown;
  similarity?: unknown;
  chapter_index?: unknown;
  chunk_index?: unknown;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readSearchRequest(request: Request): Promise<SearchRequestBody | null> {
  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
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

export async function POST(request: Request) {
  const body = await readSearchRequest(request);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return jsonError("A non-empty query string is required.", 400);
  }

  let openrouterApiKey: string;
  let supabaseUrl: string;
  let supabaseKey: string;

  try {
    openrouterApiKey = getRequiredEnv("OPENROUTER_API_KEY");
    supabaseUrl = getRequiredEnv("SUPABASE_URL");
    supabaseKey = getRequiredEnv("SUPABASE_KEY");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search gateway is not configured.";
    return jsonError(message, 500);
  }

  try {
    const openai = new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: OPENROUTER_BASE_URL,
    });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0]?.embedding;

    if (!queryEmbedding) {
      return jsonError("Embedding provider returned no vector.", 502);
    }

    const { data, error } = await supabase.rpc("search_chunks", {
      query_embedding: Array.from(queryEmbedding),
      match_count: MATCH_COUNT,
      book_uuid: BOOK_UUID,
    });

    if (error) {
      return jsonError(error.message, 502);
    }

    const rows = Array.isArray(data) ? (data as SearchChunksRow[]) : [];
    const results = rows.map(normalizeSearchResult).filter(isSearchResult).slice(0, MATCH_COUNT);

    return Response.json({ results } satisfies SearchResponseBody, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search request failed.";
    return jsonError(message, 502);
  }
}
