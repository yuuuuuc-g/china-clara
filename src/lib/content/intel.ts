/**
 * 情报雷达（intelligence）内容查询层。
 * 从 content.source_articles 读取最新抓取的情报信号（fetched_at 倒序），
 * 并通过两步查询拼接 intelligence_sources 的来源名称。
 * 统一约定：未配置或数据库错误时优雅返回空页并记录日志，绝不抛出异常。
 */

import { serviceClient } from "@/src/lib/supabase/service";

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

export interface IntelSignal {
  id: string;
  title: string;
  url: string;
  excerpt: string | null; // raw_excerpt
  sourceName: string | null;
  fetchedAt: string;
}

/** source_articles 原始行（仅本查询所需列）。 */
interface SourceArticleRow {
  id: string;
  source_id: string;
  title: string;
  url: string;
  raw_excerpt: string | null;
  fetched_at: string;
}

/** intelligence_sources 原始行（仅本查询所需列）。 */
interface IntelligenceSourceRow {
  id: string;
  name: string;
}

const DEFAULT_PER_PAGE = 30;
const MAX_PER_PAGE = 50;

/** 最新情报信号，fetched_at 倒序。perPage 默认 30，最大 50。 */
export async function listRecentSignals(opts?: {
  page?: number;
  perPage?: number;
}): Promise<{ items: IntelSignal[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, Math.floor(opts?.page ?? 1));
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, Math.floor(opts?.perPage ?? DEFAULT_PER_PAGE))
  );
  const emptyPage = { items: [] as IntelSignal[], total: 0, page, perPage };

  if (!isConfigured()) {
    return emptyPage;
  }

  // 第一步：取 source_articles 当前页（含精确总数）。
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await serviceClient()
    .schema("content")
    .from("source_articles")
    .select("id, source_id, title, url, raw_excerpt, fetched_at", { count: "exact" })
    .order("fetched_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[content.intel] listRecentSignals failed:", error.message);
    return emptyPage;
  }

  const rows = (data ?? []) as unknown as SourceArticleRow[];

  // 第二步：按去重 source_id 批量查来源名；失败时降级为 null，不隐藏条目。
  const sourceIds = [...new Set(rows.map((row) => row.source_id))];
  const sourceNames = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: sourceRows, error: sourceError } = await serviceClient()
      .schema("content")
      .from("intelligence_sources")
      .select("id, name")
      .in("id", sourceIds);

    if (sourceError) {
      console.error("[content.intel] source names failed:", sourceError.message);
    } else {
      for (const source of (sourceRows ?? []) as unknown as IntelligenceSourceRow[]) {
        sourceNames.set(source.id, source.name);
      }
    }
  }

  const items: IntelSignal[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    excerpt: row.raw_excerpt,
    sourceName: sourceNames.get(row.source_id) ?? null,
    fetchedAt: row.fetched_at,
  }));

  return { items, total: count ?? 0, page, perPage };
}
