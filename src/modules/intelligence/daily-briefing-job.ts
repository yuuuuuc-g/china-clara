import { setDefaultResultOrder } from "node:dns";
import { Agent } from "undici";
import { generateText, type LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import { z } from "zod";
import type { Database } from "@/src/lib/database.types";

setDefaultResultOrder("ipv4first");

export interface RawHeadline {
  source: string;
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
}

export interface BriefingItem {
  title: string;
  source: string;
  url: string;
  ai_summary: string;
}

export interface DailyBriefingRow extends BriefingItem {
  date: string;
}

export interface DailyBriefingJobInput {
  fetchHeadlines: () => Promise<RawHeadline[]>;
  selectBriefings: (headlines: RawHeadline[]) => Promise<BriefingItem[]>;
  persistBriefings: (rows: DailyBriefingRow[]) => Promise<unknown[]>;
  now?: () => Date;
}

export type DailyBriefingJobResult =
  | {
      status: "completed";
      date: string;
      candidatesCount: number;
      selectedCount: number;
      inserted: unknown[];
    }
  | {
      status: "failed";
      statusCode: 500 | 502;
      error: string;
    };

export const RSS_SOURCES: { name: string; url: string }[] = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { name: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { name: "NYT Business", url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "SCMP", url: "https://www.scmp.com/rss/91/feed" },
  { name: "Nikkei Asia", url: "https://asia.nikkei.com/rss/feed/nar" },
  { name: "36Kr", url: "https://36kr.com/feed" },
  { name: "The Paper World", url: "https://www.thepaper.cn/rss_newslist.jsp?nodeid=25949" },
  { name: "Tencent News", url: "https://news.qq.com/newsgn/rss_newsgn.xml" },
];

const MAX_TOTAL_HEADLINES = 50;
const PER_SOURCE_CAP = 8;
const RSS_TIMEOUT_MS = 9_000;

const ipv4OnlyAgent = new Agent({
  connect: { family: 4, timeout: 6_000 },
  bodyTimeout: 12_000,
  headersTimeout: 8_000,
});

const briefingItemSchema = z.object({
  title: z.string().min(1),
  source: z.string().min(1),
  url: z.string().url(),
  ai_summary: z.string().min(1).max(120),
});

const briefingArraySchema = z.object({
  briefings: z.array(briefingItemSchema).min(1).max(10),
});

const EDITOR_SYSTEM_PROMPT = `你是一个宏观政经主编。请从以下几十条每日新闻中，严格挑选出 5 到 10 条对全球地缘政治、宏观经济、跨国商业最具结构性影响的重大新闻。忽略娱乐、体育和普通社会新闻。
严格输出一个 JSON 对象，结构：{ "briefings": [{ "title": string, "source": string, "url": string, "ai_summary": string (50字以内的深度中文锐评) }, ...] }。
绝对不要输出任何 Markdown 代码块标记或前后解释，仅输出可被 JSON.parse 直接解析的纯 JSON。`;

export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export function buildEditorialPrompt(headlines: RawHeadline[]): string {
  const lines = headlines.map((item, index) => {
    const snippet = item.snippet ? `\n   摘要: ${item.snippet}` : "";
    return `[${index + 1}] (${item.source}) ${item.title}\n   url: ${item.url}${snippet}`;
  });
  return `今日候选新闻列表（共 ${headlines.length} 条）：\n\n${lines.join("\n\n")}\n\n请挑选 5-10 条结构性影响最大的新闻。url 与 source 字段必须严格使用上面列表里出现过的原值。`;
}

export async function fetchOneFeed(
  parser: Parser,
  source: { name: string; url: string }
): Promise<RawHeadline[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ExocortexSaturnRadar/1.0; +https://exocortex.local)",
      },
      cache: "no-store",
      // @ts-expect-error - undici dispatcher is supported by Node fetch but not in lib.dom types.
      dispatcher: ipv4OnlyAgent,
    });

    if (!response.ok) {
      console.warn(`[Saturn] feed ${source.name} returned ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    return (feed.items ?? [])
      .slice(0, PER_SOURCE_CAP)
      .map<RawHeadline | null>((item) => {
        const title = (item.title ?? "").trim();
        const url = (item.link ?? "").trim();
        if (!title || !url) return null;
        const snippet = (item.contentSnippet ?? item.content ?? "").trim().slice(0, 280);
        return {
          source: source.name,
          title,
          url,
          snippet,
          publishedAt: item.isoDate ?? item.pubDate ?? null,
        };
      })
      .filter((item): item is RawHeadline => item !== null);
  } catch (error) {
    console.warn(`[Saturn] feed ${source.name} failed`, error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function createRssHeadlineFetcher(): () => Promise<RawHeadline[]> {
  return async () => {
    const parser = new Parser({ timeout: RSS_TIMEOUT_MS });
    const feedResults = await Promise.all(RSS_SOURCES.map((source) => fetchOneFeed(parser, source)));
    return feedResults.flat().slice(0, MAX_TOTAL_HEADLINES);
  };
}

export function createAiBriefingSelector(model: LanguageModel): (headlines: RawHeadline[]) => Promise<BriefingItem[]> {
  return async (headlines) => {
    const { text: rawText } = await generateText({
      model,
      system: EDITOR_SYSTEM_PROMPT,
      prompt: buildEditorialPrompt(headlines),
      temperature: 0.3,
      providerOptions: {
        openai: { response_format: { type: "json_object" } },
      },
    });

    const parsedJson: unknown = JSON.parse(extractJsonPayload(rawText));
    const parsed = briefingArraySchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error("[Saturn] AI returned non-conforming JSON", parsed.error.format());
      throw new Error("AI returned JSON that failed schema validation.");
    }

    return parsed.data.briefings;
  };
}

export function createSupabaseBriefingPersister(
  supabase: SupabaseClient<Database>
): (rows: DailyBriefingRow[]) => Promise<unknown[]> {
  return async (rows) => {
    const { error, data } = await supabase
      .from("daily_briefings")
      .upsert(rows, { onConflict: "date,url", ignoreDuplicates: false })
      .select("id, source, title, url, ai_summary");

    if (error) {
      console.error("[Saturn] Supabase upsert failed", error);
      throw new Error("Supabase upsert failed");
    }

    return data ?? [];
  };
}

export async function runDailyBriefingJob(
  input: DailyBriefingJobInput
): Promise<DailyBriefingJobResult> {
  const headlines = await input.fetchHeadlines();

  if (headlines.length === 0) {
    return {
      status: "failed",
      statusCode: 502,
      error: "No headlines fetched from any RSS source.",
    };
  }

  let selected: BriefingItem[];
  try {
    selected = await input.selectBriefings(headlines);
  } catch (error) {
    console.error("[Saturn] AI editor extraction failed", error);
    return {
      status: "failed",
      statusCode: 502,
      error: "AI editor extraction failed",
    };
  }

  const allowedUrls = new Set(headlines.map((item) => item.url));
  const sanitized = selected.filter((item) => allowedUrls.has(item.url));

  if (sanitized.length === 0) {
    return {
      status: "failed",
      statusCode: 502,
      error: "AI returned items but none matched the source URL whitelist.",
    };
  }

  const today = (input.now?.() ?? new Date()).toISOString().slice(0, 10);
  const rows = sanitized.map((item) => ({
    date: today,
    source: item.source,
    title: item.title,
    url: item.url,
    ai_summary: item.ai_summary,
  }));

  try {
    const inserted = await input.persistBriefings(rows);
    return {
      status: "completed",
      date: today,
      candidatesCount: headlines.length,
      selectedCount: sanitized.length,
      inserted,
    };
  } catch {
    return {
      status: "failed",
      statusCode: 500,
      error: "Supabase upsert failed",
    };
  }
}
