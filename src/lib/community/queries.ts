import { serviceClient } from "@/src/lib/supabase/service";
import type { Locale } from "@/src/i18n/config";

/**
 * community 域「用户文章」查询层。/api/v1 路由与 SSR 页共用（API-first）。
 * PostgREST 不跨 schema embed，帖子与 crm 作者资料分两步查询后在此拼装。
 * Supabase 未配置或出错时优雅返回空，不抛错。
 */

export interface CommunityPostListItem {
  id: string;
  slug: string;
  lang: string;
  title: string;
  /** body_md 去掉常见 Markdown 语法后截取前 160 字符作摘要。 */
  excerpt: string;
  authorName: string | null;
  publishedAt: string | null;
}

export interface CommunityPostDetail {
  id: string;
  slug: string;
  lang: string;
  title: string;
  bodyMd: string;
  authorName: string | null;
  publishedAt: string | null;
}

export type WriteResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };

interface RawPost {
  id: string;
  author_profile_id: string;
  slug: string;
  lang: string;
  title: string;
  body_md: string;
  published_at: string | null;
}

interface RawProfile {
  id: string;
  display_name: string | null;
}

interface RawCreatedPost {
  id: string;
  slug: string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

/** 生成可读 slug，并追加随机后缀避免标题碰撞。 */
export function slugifyTitle(title: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "post";
  const suffix = Math.floor(Math.random() * 0x1000000)
    .toString(16)
    .padStart(6, "0");

  return `${base}-${suffix}`;
}

function excerptFromMarkdown(bodyMd: string): string {
  return bodyMd
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/```(?:\w+)?\n?/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/** 作者名是装饰性信息：查询失败时降级为空 Map（帖子照常显示），不拖垮内容。 */
async function getAuthorNames(
  authorProfileIds: string[],
  operation: string
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(authorProfileIds)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await serviceClient()
    .schema("crm")
    .from("profiles")
    .select("id, display_name")
    .in("id", uniqueIds);

  if (error) {
    console.error(`[community.queries] ${operation} failed:`, error.message);
    return new Map();
  }

  return new Map(
    ((data ?? []) as unknown as RawProfile[]).map((profile) => [
      profile.id,
      profile.display_name,
    ])
  );
}

const POST_SELECT =
  "id, author_profile_id, slug, lang, title, body_md, published_at";

/** 已发布帖子列表，published_at 倒序，分页。 */
export async function listPublishedPosts(opts?: {
  page?: number;
  perPage?: number;
}): Promise<{
  items: CommunityPostListItem[];
  total: number;
  page: number;
  perPage: number;
}> {
  const page = Math.max(1, opts?.page ?? 1);
  const perPage = Math.min(50, Math.max(1, opts?.perPage ?? 20));
  if (!isConfigured()) return { items: [], total: 0, page, perPage };

  const { data, error, count } = await serviceClient()
    .schema("community")
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) {
    console.error("[community.queries] listPublishedPosts failed:", error.message);
    return { items: [], total: 0, page, perPage };
  }
  if (!data) return { items: [], total: 0, page, perPage };

  const rows = data as unknown as RawPost[];
  const authorNames = await getAuthorNames(
    rows.map((row) => row.author_profile_id),
    "listPublishedPosts profiles"
  );

  const items = rows.map((row): CommunityPostListItem => ({
    id: row.id,
    slug: row.slug,
    lang: row.lang,
    title: row.title,
    excerpt: excerptFromMarkdown(row.body_md),
    authorName: authorNames.get(row.author_profile_id) ?? null,
    publishedAt: row.published_at,
  }));

  return { items, total: count ?? items.length, page, perPage };
}

/** 按 slug 取已发布帖子；不存在或未发布返回 null。 */
export async function getPublishedPost(opts: {
  slug: string;
}): Promise<CommunityPostDetail | null> {
  if (!isConfigured()) return null;

  const { data, error } = await serviceClient()
    .schema("community")
    .from("posts")
    .select(POST_SELECT)
    .eq("slug", opts.slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[community.queries] getPublishedPost failed:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as RawPost;
  const authorNames = await getAuthorNames(
    [row.author_profile_id],
    "getPublishedPost profile"
  );

  return {
    id: row.id,
    slug: row.slug,
    lang: row.lang,
    title: row.title,
    bodyMd: row.body_md,
    authorName: authorNames.get(row.author_profile_id) ?? null,
    publishedAt: row.published_at,
  };
}

/** 发帖：status 固定为 review，slug 自动生成。 */
export async function createPost(opts: {
  authorProfileId: string;
  lang: Locale;
  title: string;
  bodyMd: string;
}): Promise<WriteResult<{ id: string; slug: string }>> {
  if (!isConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: "Supabase is not configured",
    };
  }

  const slug = slugifyTitle(opts.title);
  const { data, error } = await serviceClient()
    .schema("community")
    .from("posts")
    .insert({
      author_profile_id: opts.authorProfileId,
      lang: opts.lang,
      title: opts.title,
      body_md: opts.bodyMd,
      slug,
      status: "review",
    })
    .select("id, slug")
    .single();

  if (error) {
    return {
      ok: false,
      code: "post_insert_failed",
      message: error.message,
    };
  }

  const post = data as unknown as RawCreatedPost | null;
  if (!post) {
    return {
      ok: false,
      code: "post_insert_failed",
      message: "Post insert returned no data",
    };
  }

  return { ok: true, id: post.id, slug: post.slug };
}
