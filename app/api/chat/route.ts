import OpenAI from "openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const CHAT_MODEL = "qwen/qwen-2.5-72b-instruct";
const MAX_REFERENCES = 3;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatReference {
  content: string;
}

interface ChatRequestBody {
  query?: unknown;
  references?: unknown;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readChatRequest(request: Request): Promise<ChatRequestBody | null> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body;
  } catch {
    return null;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function isChatReference(value: unknown): value is ChatReference {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ChatReference>;
  return typeof row.content === "string" && row.content.trim().length > 0;
}

function buildSystemPrompt(references: ChatReference[]): string {
  const referenceText = references
    .slice(0, MAX_REFERENCES)
    .map((reference, index) => `参考资料 ${index + 1}:\n${reference.content.trim()}`)
    .join("\n\n");

  return `你是一个严肃的经济学外脑。请严格基于以下检索到的参考资料回答用户问题。不要捏造资料中没有的信息。

${referenceText}

回答要求：
1. 先直接回答问题。
2. 明确指出你的判断来自哪些参考资料。
3. 如果参考资料不足以回答，请说明“不足以从资料中判断”。`;
}

export async function POST(request: Request) {
  const body = await readChatRequest(request);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) return jsonError("A non-empty query string is required.", 400);

  const references = Array.isArray(body?.references)
    ? body.references.filter(isChatReference).slice(0, MAX_REFERENCES)
    : [];

  if (references.length === 0) return jsonError("At least one reference content item is required.", 400);

  let apiKey: string;
  try {
    apiKey = getRequiredEnv("OPENROUTER_API_KEY");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat gateway is not configured.";
    return jsonError(message, 500);
  }

  try {
    const openai = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      // ✨ 修正 1：强行注入 OpenRouter 需要的安全头
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Exocortex",
      }
    });

    const completionStream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(references) },
        { role: "user", content: query },
      ],
      stream: true,
      temperature: 0.2,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of completionStream) {
            const content = part.choices[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      // ✨ 修正 2：补齐标准的 Server-Sent Events (SSE) 头，防止某些浏览器拒收流式数据
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
      },
      status: 200,
    });
  } catch (error) {
    // ✨ 核心修正 3：打印真正的死因！
    console.error("\n🚨 [大模型 API 阻击日志]:", error);
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return jsonError(message, 502);
  }
}