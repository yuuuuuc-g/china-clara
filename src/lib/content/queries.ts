import { serviceClient } from "@/src/lib/supabase/service";
import type { Locale } from "@/src/i18n/config";

/**
 * content 域「读懂中国」文章的查询层。
 * /api/v1 路由与 SSR 页面共用同一套函数（API-first：单一受控网关逻辑，
 * 绝不散落裸 PostgREST 访问）。Supabase 未配置时优雅返回空，
 * 让页面在建站过渡期仍可构建/渲染空状态。
 */

export interface ArticleListItem {
  id: string;
  slug: string;
  publishedAt: string | null;
  topicSlug: string | null;
  title: string;
  summary: string | null;
}

export interface ArticleDetail extends ArticleListItem {
  bodyMd: string;
  humanReviewed: boolean;
}

interface RawTranslation {
  title: string;
  summary: string | null;
  body_md?: string;
  human_reviewed?: boolean;
}

interface RawTopic {
  slug: string;
}

interface RawArticleRow {
  id: string;
  slug: string;
  published_at: string | null;
  // supabase-js 把嵌入关系推断为数组，实际 to-one 运行时是对象，两者都兜住。
  topic: RawTopic | RawTopic[] | null;
  translation: RawTranslation[] | RawTranslation | null;
}

function firstTranslation(row: RawArticleRow): RawTranslation | null {
  const t = row.translation;
  if (!t) return null;
  return Array.isArray(t) ? (t[0] ?? null) : t;
}

function topicSlug(row: RawArticleRow): string | null {
  const topic = row.topic;
  if (!topic) return null;
  return Array.isArray(topic) ? (topic[0]?.slug ?? null) : topic.slug;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

const LIST_SELECT =
  "id, slug, published_at, topic:topics(slug), translation:article_translations!inner(title, summary, lang)";
const DETAIL_SELECT =
  "id, slug, published_at, topic:topics(slug), translation:article_translations!inner(title, summary, body_md, human_reviewed, lang)";

export async function listPublishedArticles(opts: {
  lang: Locale;
  topic?: string | null;
  page?: number;
  perPage?: number;
}): Promise<{ items: ArticleListItem[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(50, Math.max(1, opts.perPage ?? 20));
  if (!isConfigured()) return { items: [], total: 0, page, perPage };

  let query = serviceClient()
    .schema("content")
    .from("articles")
    .select(LIST_SELECT, { count: "exact" })
    .eq("status", "published")
    .eq("article_translations.lang", opts.lang)
    .order("published_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (opts.topic) query = query.eq("topics.slug", opts.topic);

  const { data, error, count } = await query;
  if (error) {
    console.error("[content.queries] listPublishedArticles failed:", error.message);
    return { items: [], total: 0, page, perPage };
  }
  if (!data) return { items: [], total: 0, page, perPage };

  const items = (data as unknown as RawArticleRow[])
    .map((row): ArticleListItem | null => {
      const t = firstTranslation(row);
      if (!t) return null;
      return {
        id: row.id,
        slug: row.slug,
        publishedAt: row.published_at,
        topicSlug: topicSlug(row),
        title: t.title,
        summary: t.summary ?? null,
      };
    })
    .filter((x): x is ArticleListItem => x !== null);

  return { items, total: count ?? items.length, page, perPage };
}

export async function getPublishedArticle(opts: {
  lang: Locale;
  slug: string;
}): Promise<ArticleDetail | null> {
  if (!isConfigured()) return null;

  const { data, error } = await serviceClient()
    .schema("content")
    .from("articles")
    .select(DETAIL_SELECT)
    .eq("status", "published")
    .eq("slug", opts.slug)
    .eq("article_translations.lang", opts.lang)
    .maybeSingle();

  if (error) {
    console.error("[content.queries] getPublishedArticle failed:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as RawArticleRow;
  const t = firstTranslation(row);
  if (!t || !t.body_md) return null;

  return {
    id: row.id,
    slug: row.slug,
    publishedAt: row.published_at,
    topicSlug: topicSlug(row),
    title: t.title,
    summary: t.summary ?? null,
    bodyMd: t.body_md,
    humanReviewed: Boolean(t.human_reviewed),
  };
}
