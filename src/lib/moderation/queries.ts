/**
 * moderation 审核后台查询层。
 * 提供待审社区帖 / 供应商的列表查询与通过、驳回写操作；
 * 读操作优雅降级返回 []，写操作带状态前置条件防止重复处理与越权改写。
 */

import { serviceClient } from "@/src/lib/supabase/service";

export interface PendingPost {
  id: string;
  slug: string;
  lang: string;
  title: string;
  /** body_md 去 Markdown 语法后前 160 字符。 */
  excerpt: string;
  authorName: string | null;
  createdAt: string;
}

export interface PendingSupplier {
  id: string;
  slug: string;
  companyName: string;
  companyNameEn: string | null;
  createdAt: string;
}

export type WriteResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };

interface RawPost {
  id: string;
  slug: string;
  lang: string;
  title: string;
  body_md: string;
  author_profile_id: string;
  created_at: string;
}

interface RawSupplier {
  id: string;
  slug: string;
  company_name: string;
  company_name_en: string | null;
  created_at: string;
}

interface RawProfile {
  id: string;
  display_name: string | null;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function notConfigured(): WriteResult<object> {
  return {
    ok: false,
    code: "not_configured",
    message: "Supabase is not configured",
  };
}

/** 按 author_profile_id 去重批量查 crm.profiles；失败降级为空 Map，不拖垮主列表。 */
async function fetchAuthorNames(
  profileIds: string[]
): Promise<Map<string, string | null>> {
  const names = new Map<string, string | null>();
  const uniqueIds = [...new Set(profileIds.filter((id) => id.length > 0))];
  if (uniqueIds.length === 0) {
    return names;
  }
  try {
    const { data, error } = await serviceClient()
      .schema("crm")
      .from("profiles")
      .select("id, display_name")
      .in("id", uniqueIds);
    if (error) {
      console.error("[moderation.queries] fetchAuthorNames failed:", error.message);
      return names;
    }
    const profiles = (data ?? []) as unknown as RawProfile[];
    for (const profile of profiles) {
      names.set(profile.id, profile.display_name);
    }
  } catch (error) {
    console.error(
      "[moderation.queries] fetchAuthorNames failed:",
      toErrorMessage(error)
    );
  }
  return names;
}

/** 待审社区帖，created_at 升序（先进先审），最多 50 条。 */
export async function listPendingPosts(): Promise<PendingPost[]> {
  if (!isConfigured()) {
    return [];
  }
  try {
    const { data, error } = await serviceClient()
      .schema("community")
      .from("posts")
      .select("id, slug, lang, title, body_md, author_profile_id, created_at")
      .eq("status", "review")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) {
      console.error("[moderation.queries] listPendingPosts failed:", error.message);
      return [];
    }
    const posts = (data ?? []) as unknown as RawPost[];
    const authorNames = await fetchAuthorNames(
      posts.map((post) => post.author_profile_id)
    );
    return posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      lang: post.lang,
      title: post.title,
      excerpt: excerptFromMarkdown(post.body_md),
      authorName: authorNames.get(post.author_profile_id) ?? null,
      createdAt: post.created_at,
    }));
  } catch (error) {
    console.error(
      "[moderation.queries] listPendingPosts failed:",
      toErrorMessage(error)
    );
    return [];
  }
}

/** 待审供应商，created_at 升序，最多 50 条。 */
export async function listPendingSuppliers(): Promise<PendingSupplier[]> {
  if (!isConfigured()) {
    return [];
  }
  try {
    const { data, error } = await serviceClient()
      .schema("catalog")
      .from("suppliers")
      .select("id, slug, company_name, company_name_en, created_at")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) {
      console.error("[moderation.queries] listPendingSuppliers failed:", error.message);
      return [];
    }
    const suppliers = (data ?? []) as unknown as RawSupplier[];
    return suppliers.map((supplier) => ({
      id: supplier.id,
      slug: supplier.slug,
      companyName: supplier.company_name,
      companyNameEn: supplier.company_name_en,
      createdAt: supplier.created_at,
    }));
  } catch (error) {
    console.error(
      "[moderation.queries] listPendingSuppliers failed:",
      toErrorMessage(error)
    );
    return [];
  }
}

/** 通过帖子：status review -> published 并写 published_at=now()。 */
export async function approvePost(opts: {
  postId: string;
}): Promise<WriteResult<object>> {
  if (!isConfigured()) {
    return notConfigured();
  }
  const { data, error } = await serviceClient()
    .schema("community")
    .from("posts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", opts.postId)
    .eq("status", "review")
    .select("id");
  if (error) {
    return { ok: false, code: "update_failed", message: error.message };
  }
  const rows = (data ?? []) as unknown as Array<{ id: string }>;
  if (rows.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: `Post ${opts.postId} not found or not pending review`,
    };
  }
  return { ok: true };
}

/** 驳回帖子：status review -> rejected。 */
export async function rejectPost(opts: {
  postId: string;
}): Promise<WriteResult<object>> {
  if (!isConfigured()) {
    return notConfigured();
  }
  const { data, error } = await serviceClient()
    .schema("community")
    .from("posts")
    .update({ status: "rejected" })
    .eq("id", opts.postId)
    .eq("status", "review")
    .select("id");
  if (error) {
    return { ok: false, code: "update_failed", message: error.message };
  }
  const rows = (data ?? []) as unknown as Array<{ id: string }>;
  if (rows.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: `Post ${opts.postId} not found or not pending review`,
    };
  }
  return { ok: true };
}

/** 通过供应商：verification_status pending -> verified。 */
export async function approveSupplier(opts: {
  supplierId: string;
}): Promise<WriteResult<object>> {
  if (!isConfigured()) {
    return notConfigured();
  }
  const { data, error } = await serviceClient()
    .schema("catalog")
    .from("suppliers")
    .update({ verification_status: "verified" })
    .eq("id", opts.supplierId)
    .eq("verification_status", "pending")
    .select("id");
  if (error) {
    return { ok: false, code: "update_failed", message: error.message };
  }
  const rows = (data ?? []) as unknown as Array<{ id: string }>;
  if (rows.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: `Supplier ${opts.supplierId} not found or not pending verification`,
    };
  }
  return { ok: true };
}

/** 驳回供应商：verification_status pending -> rejected。 */
export async function rejectSupplier(opts: {
  supplierId: string;
}): Promise<WriteResult<object>> {
  if (!isConfigured()) {
    return notConfigured();
  }
  const { data, error } = await serviceClient()
    .schema("catalog")
    .from("suppliers")
    .update({ verification_status: "rejected" })
    .eq("id", opts.supplierId)
    .eq("verification_status", "pending")
    .select("id");
  if (error) {
    return { ok: false, code: "update_failed", message: error.message };
  }
  const rows = (data ?? []) as unknown as Array<{ id: string }>;
  if (rows.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: `Supplier ${opts.supplierId} not found or not pending verification`,
    };
  }
  return { ok: true };
}
