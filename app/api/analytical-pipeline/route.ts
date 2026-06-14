import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createRagRepository } from "@/src/modules/rag/repository";
import {
  isRefineryPhase,
  runRefineryPhase,
} from "@/src/modules/refinery/phase";

interface RefineryRequestBody {
  prompt?: unknown;
  phase?: unknown;
  topicTitle?: unknown;
  bookUuid?: unknown;
}

const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const MAX_PROMPT_CHARS = 4_000;
const MAX_TOPIC_TITLE_CHARS = 200;

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const kimi = createOpenAI({
  baseURL: "https://api.moonshot.cn/v1",
  apiKey: process.env.KIMI_API_KEY,
});

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getRequiredSupabaseKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? "";
}

async function readRefineryRequest(request: Request): Promise<RefineryRequestBody | null> {
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

export async function POST(request: Request) {
  const body = await readRefineryRequest(request);
  if (!body) {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  const prompt = body.prompt;
  const phase = isRefineryPhase(body.phase) ? body.phase : "A";
  const topicTitleCandidate = typeof body.topicTitle === "string" ? body.topicTitle.trim() : "";
  if (topicTitleCandidate.length > MAX_TOPIC_TITLE_CHARS) {
    return Response.json(
      { error: `topicTitle must be ${MAX_TOPIC_TITLE_CHARS} characters or fewer.` },
      { status: 413 }
    );
  }
  const topicTitle = topicTitleCandidate.length > 0 ? topicTitleCandidate : undefined;
  const rawBookUuid = body.bookUuid;
  if (rawBookUuid !== undefined && typeof rawBookUuid !== "string") {
    return Response.json({ error: "bookUuid must be a string when provided." }, { status: 400 });
  }
  const bookUuid = typeof rawBookUuid === "string" ? rawBookUuid.trim() : "";
  if (bookUuid.length > 0 && !isUuid(bookUuid)) {
    return Response.json({ error: "bookUuid must be a valid UUID when provided." }, { status: 400 });
  }

  const model = process.env.REFINERY_MODEL === "kimi"
    ? kimi.chat("moonshot-v1-8k")
    : deepseek.chat("deepseek-v4-pro");

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "A non-empty prompt string is required." }, { status: 400 });
  }
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length > MAX_PROMPT_CHARS) {
    return Response.json(
      { error: `Prompt must be ${MAX_PROMPT_CHARS} characters or fewer.` },
      { status: 413 }
    );
  }

  const supabaseKey = getRequiredSupabaseKey();
  if (!process.env.SILICONFLOW_API_KEY || !process.env.SUPABASE_URL || !supabaseKey) {
    return Response.json(
      { error: "Local knowledge retrieval is not configured." },
      { status: 500 }
    );
  }

  const embeddingClient = new OpenAI({
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseURL: SILICONFLOW_BASE_URL,
  });
  const ragRepository = createRagRepository(createClient(process.env.SUPABASE_URL, supabaseKey));
  const result = runRefineryPhase({
    model,
    prompt: trimmedPrompt,
    phase,
    topicTitle,
    bookUuid,
    embeddingClient,
    ragRepository,
  });

  return result.toTextStreamResponse();
}
