import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminEnv } from "@/src/lib/env";
import { createOpenAICompatibleClient } from "@/src/modules/ai/provider-adapter";
import { createRagRepository } from "@/src/modules/rag/repository";
import {
  type AiDomainEvent,
  createDomainEventStream,
  domainEventStreamHeaders,
} from "@/src/lib/ai-domain-events";
import {
  MAX_QUERY_CHARS,
  runRetrievalAgent,
  type RetrievalAgentEvent,
} from "@/src/modules/retrieval/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchRequestBody {
  query?: unknown;
  bookUuid?: unknown;
}

function jsonError(message: string, status: number) {
  if (status >= 500) {
    console.error(`\n🚨 [API 致命错误 ${status}]:`, message, "\n");
  } else {
    console.warn(`\n⚠️ [API 警告 ${status}]:`, message, "\n");
  }
  return Response.json({ error: message }, { status });
}

function logServerError(context: string, error: unknown): void {
  console.error(`[Search API] ${context}:`, error);
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toDomainEvent(event: RetrievalAgentEvent): AiDomainEvent {
  if (event.type === "agent_started") {
    return {
      type: "retrieval.started",
      query: event.data.query,
      rewrittenQuery: event.data.rewrittenQuery,
      maxIterations: event.data.maxIterations,
    };
  }

  if (event.type === "tool_call_started") {
    return {
      type: "retrieval.query",
      iteration: event.data.iteration,
      query: event.data.query,
      matchCount: event.data.matchCount,
    };
  }

  if (event.type === "tool_call_result") {
    return {
      type: "retrieval.result",
      iteration: event.data.iteration,
      results: event.data.results,
      retrievedChunks: event.data.retrievedChunks,
    };
  }

  if (event.type === "model_delta") {
    return {
      type: "generation.delta",
      iteration: event.data.iteration,
      text: event.data.delta,
    };
  }

  if (event.type === "iteration_summary") {
    return {
      type: "generation.step",
      iteration: event.data.iteration,
      retrievedChunks: event.data.retrievedChunks,
      latencyMs: event.data.latencyMs,
      label: event.data.continueReason,
    };
  }

  if (event.type === "agent_finished") {
    return {
      type: "generation.finished",
      text: event.data.answer,
      results: event.data.results,
      totalIterations: event.data.totalIterations,
    };
  }

  return {
    type: "generation.failed",
    reason: event.data.reason,
    message: event.data.message,
  };
}

export async function POST(request: Request) {
  const body = await readSearchRequest(request);
  const { query: rawQuery, bookUuid: rawBookUuid } = body ?? {};
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

  if (!query) {
    return jsonError("A non-empty query string is required.", 400);
  }
  if (query.length > MAX_QUERY_CHARS) {
    return jsonError(`Query must be ${MAX_QUERY_CHARS} characters or fewer.`, 413);
  }

  if (rawBookUuid !== undefined && typeof rawBookUuid !== "string") {
    return jsonError("bookUuid must be a string when provided.", 400);
  }

  const bookUuid = typeof rawBookUuid === "string" ? rawBookUuid.trim() : "";

  if (bookUuid.length > 0 && !isUuid(bookUuid)) {
    return jsonError("bookUuid must be a valid UUID when provided.", 400);
  }

  let supabaseUrl: string;
  let supabaseKey: string;
  let llmClient: ReturnType<typeof createOpenAICompatibleClient>;
  let embeddingClient: ReturnType<typeof createOpenAICompatibleClient>;
  let agentClient: ReturnType<typeof createOpenAICompatibleClient>;

  try {
    const env = getSupabaseAdminEnv();
    supabaseUrl = env.supabaseUrl;
    supabaseKey = env.supabaseKey;
    llmClient = createOpenAICompatibleClient("gemini");
    embeddingClient = createOpenAICompatibleClient("siliconflow");
    agentClient = createOpenAICompatibleClient("deepseek");
  } catch (error) {
    logServerError("missing configuration", error);
    return jsonError("Search gateway is not configured.", 500);
  }

  try {
    const ragRepository = createRagRepository(createClient(supabaseUrl, supabaseKey));
    const stream = createDomainEventStream(async (sendEvent) => {
      for await (const event of runRetrievalAgent({
          query,
          bookUuid,
          queryRewriteClient: llmClient,
          agentClient,
          embeddingClient,
          ragRepository,
          log: {
            info: (message) => console.log(message),
            error: logServerError,
          },
        })) {
          sendEvent(toDomainEvent(event));
      }
    });

    return new Response(stream, {
      headers: domainEventStreamHeaders(),
      status: 200,
    });
  } catch (error) {
    logServerError("request failed", error);
    return jsonError("Search request failed.", 500);
  }
}
