/**
 * 中拉贸易情报抓取管线（China Clara · content 域）
 *
 * 本模块替代 legacy 的 knowledge-galaxy 抓取管线，负责把中拉贸易相关的
 * RSS 情报源抓取进 content 域的 intelligence_sources / source_articles 两张表：
 *   - 信息源清单见 config/intelligence-sources-latam.json（id / name / url）
 *   - 源记录按 url 幂等写入 content.intelligence_sources（url 有 unique 约束）
 *   - 文章按 (source_id, url) 幂等写入 content.source_articles，重复抓取不产生重复行
 *   - 单个源失败仅记录到该源结果的 error 字段并跳过，不中断其余源的抓取
 */

import Parser from "rss-parser";
import sources from "@/config/intelligence-sources-latam.json";
import { serviceClient } from "@/src/lib/supabase/service";

/** Supabase 是否已配置（未配置时 serviceClient 会 throw，需提前守卫） */
function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

/** 单个情报源的抓取结果 */
export interface SourceIngestResult {
  sourceId: string; // 配置里的 id（如 "mercopress"）
  name: string;
  fetched: number; // RSS 里拿到并通过 title/link 校验、实际参与写入的条数
  inserted: number; // 实际新插入条数（按 (source_id, url) 去重，已存在的行不计入）
  error?: string; // 该源失败原因（失败不影响其他源）
}

/** 整轮抓取的汇总 */
export interface IngestSummary {
  ok: boolean; // 整体是否执行（未配置 = false）
  results: SourceIngestResult[];
}

/** RSS 解析器（全局复用；单源请求超时 15s） */
const parser = new Parser({ timeout: 15000 });

/** 每个源单次最多抓取的条目数 */
const MAX_ITEMS_PER_SOURCE = 20;

/** 数据库客户端类型（serviceClient 返回 untyped SupabaseClient） */
type DbClient = ReturnType<typeof serviceClient>;

/** 通过 title/link 校验后的 RSS 条目（两个字段收窄为必填） */
type ValidFeedItem = Parser.Item & { title: string; link: string };

/** 过滤掉缺少 title 或 link 的条目 */
function isValidFeedItem(item: Parser.Item): item is ValidFeedItem {
  return Boolean(item.title && item.link);
}

/**
 * 确保 content.intelligence_sources 中存在该源记录并返回其 id：
 * 先按 url 查（maybeSingle），不存在则插入 { name, url } 并拿回 id。
 */
async function ensureSourceId(
  client: DbClient,
  name: string,
  url: string
): Promise<string> {
  const { data: existingData, error: lookupError } = await client
    .schema("content")
    .from("intelligence_sources")
    .select("id")
    .eq("url", url)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`intelligence_sources 查询失败: ${lookupError.message}`);
  }
  const existing = existingData as { id: string } | null;
  if (existing) {
    return existing.id;
  }

  const { data: insertedData, error: insertError } = await client
    .schema("content")
    .from("intelligence_sources")
    .insert({ name, url })
    .select("id")
    .single();
  if (insertError) {
    throw new Error(`intelligence_sources 插入失败: ${insertError.message}`);
  }
  const inserted = insertedData as { id: string } | null;
  if (!inserted) {
    throw new Error("intelligence_sources 插入未返回记录");
  }
  return inserted.id;
}

/** 抓取并写入单个情报源；任何失败以异常抛出，由调用方记入该源结果 */
async function ingestSource(
  client: DbClient,
  source: { id: string; name: string; url: string }
): Promise<SourceIngestResult> {
  const sourceRowId = await ensureSourceId(client, source.name, source.url);

  const feed = await parser.parseURL(source.url);
  const items = feed.items
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .filter(isValidFeedItem);

  if (items.length === 0) {
    return { sourceId: source.id, name: source.name, fetched: 0, inserted: 0 };
  }

  const rows = items.map((item) => ({
    source_id: sourceRowId,
    external_id: item.guid ?? item.link,
    title: item.title.slice(0, 500),
    url: item.link,
    raw_excerpt: (item.contentSnippet ?? item.content ?? "").slice(0, 500) || null,
  }));

  // 按 (source_id, url) 幂等 upsert：已存在的行被忽略且不会返回
  const { data: upsertedData, error: upsertError } = await client
    .schema("content")
    .from("source_articles")
    .upsert(rows, { onConflict: "source_id,url", ignoreDuplicates: true })
    .select("id");
  if (upsertError) {
    throw new Error(`source_articles 写入失败: ${upsertError.message}`);
  }
  const upserted = upsertedData as { id: string }[] | null;

  return {
    sourceId: source.id,
    name: source.name,
    fetched: rows.length,
    inserted: upserted?.length ?? 0,
  };
}

/**
 * 抓取全部中拉情报源：
 * - Supabase 未配置时直接返回 { ok: false, results: [] }
 * - 逐源顺序处理，单源失败只记入该源的 error 并继续下一源
 */
export async function ingestLatamSources(): Promise<IngestSummary> {
  if (!isConfigured()) {
    return { ok: false, results: [] };
  }

  const client = serviceClient();
  const results: SourceIngestResult[] = [];

  for (const source of sources) {
    try {
      results.push(await ingestSource(client, source));
    } catch (err) {
      console.error(`[intel-ingest] ${source.name} failed:`, err);
      results.push({
        sourceId: source.id,
        name: source.name,
        fetched: 0,
        inserted: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ok: true, results };
}
