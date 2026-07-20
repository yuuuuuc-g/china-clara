import { serviceClient } from "@/src/lib/supabase/service";
import type { WriteResult } from "@/src/lib/community/queries";

/**
 * community 域「帖子互动」查询层：评论 + 点赞。/api/v1 路由、server actions 与
 * SSR 页共用（API-first）。只允许对已发布（status=published）的帖子互动。
 * 读操作未配置/出错时优雅降级；写操作返回判别结果，不静默吞错。
 */

export interface CommentItem {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}

export interface PostEngagement {
  likeCount: number;
  /** 未登录访客恒为 false。 */
  likedByViewer: boolean;
}

interface RawComment {
  id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

/** 目标帖必须存在且已发布；返回 id，否则 null。防止对 review/rejected 帖互动。 */
async function publishedPostId(postId: string): Promise<string | null> {
  const { data, error } = await serviceClient()
    .schema("community")
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    console.error("[community.interactions] post lookup failed:", error.message);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

/** 作者名装饰性信息：失败降级为空 Map，不拖垮评论列表。 */
async function fetchAuthorNames(ids: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await serviceClient()
    .schema("crm")
    .from("profiles")
    .select("id, display_name")
    .in("id", unique);
  if (error) {
    console.error("[community.interactions] author names failed:", error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as unknown as Array<{ id: string; display_name: string | null }>).map((p) => [
      p.id,
      p.display_name,
    ])
  );
}

/** 帖子评论，时间升序（楼层顺序），最多 100 条。 */
export async function listComments(postId: string): Promise<CommentItem[]> {
  if (!isConfigured()) return [];

  const { data, error } = await serviceClient()
    .schema("community")
    .from("comments")
    .select("id, author_profile_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[community.interactions] listComments failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as RawComment[];
  const names = await fetchAuthorNames(rows.map((r) => r.author_profile_id));
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    authorName: names.get(r.author_profile_id) ?? null,
    createdAt: r.created_at,
  }));
}

/** 点赞数 + 当前查看者是否已赞（viewer 可空 = 未登录）。 */
export async function getPostEngagement(opts: {
  postId: string;
  viewerProfileId?: string | null;
}): Promise<PostEngagement> {
  const empty: PostEngagement = { likeCount: 0, likedByViewer: false };
  if (!isConfigured()) return empty;
  const client = serviceClient();

  const { error, count } = await client
    .schema("community")
    .from("reactions")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", opts.postId)
    .eq("kind", "like");
  if (error) {
    console.error("[community.interactions] like count failed:", error.message);
    return empty;
  }

  let likedByViewer = false;
  if (opts.viewerProfileId) {
    const { data: mine, error: mineError } = await client
      .schema("community")
      .from("reactions")
      .select("post_id")
      .eq("post_id", opts.postId)
      .eq("profile_id", opts.viewerProfileId)
      .eq("kind", "like")
      .maybeSingle();
    if (mineError) {
      console.error("[community.interactions] viewer like failed:", mineError.message);
    } else {
      likedByViewer = Boolean(mine);
    }
  }

  return { likeCount: count ?? 0, likedByViewer };
}

/** 发表评论（仅已发布帖）。 */
export async function addComment(opts: {
  postId: string;
  authorProfileId: string;
  body: string;
}): Promise<WriteResult<{ id: string }>> {
  if (!isConfigured()) {
    return { ok: false, code: "not_configured", message: "Supabase is not configured" };
  }
  if (!(await publishedPostId(opts.postId))) {
    return { ok: false, code: "not_found", message: "Post not found or not published" };
  }

  const { data, error } = await serviceClient()
    .schema("community")
    .from("comments")
    .insert({
      post_id: opts.postId,
      author_profile_id: opts.authorProfileId,
      body: opts.body,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, code: "comment_insert_failed", message: error?.message ?? "insert failed" };
  }
  return { ok: true, id: (data as { id: string }).id };
}

/** 点赞开关：已赞则取消，未赞则点上。返回最新状态与计数。 */
export async function toggleLike(opts: {
  postId: string;
  profileId: string;
}): Promise<WriteResult<{ liked: boolean; likeCount: number }>> {
  if (!isConfigured()) {
    return { ok: false, code: "not_configured", message: "Supabase is not configured" };
  }
  if (!(await publishedPostId(opts.postId))) {
    return { ok: false, code: "not_found", message: "Post not found or not published" };
  }
  const client = serviceClient();

  const { data: existing, error: lookupError } = await client
    .schema("community")
    .from("reactions")
    .select("post_id")
    .eq("post_id", opts.postId)
    .eq("profile_id", opts.profileId)
    .eq("kind", "like")
    .maybeSingle();
  if (lookupError) {
    return { ok: false, code: "reaction_lookup_failed", message: lookupError.message };
  }

  if (existing) {
    const { error } = await client
      .schema("community")
      .from("reactions")
      .delete()
      .eq("post_id", opts.postId)
      .eq("profile_id", opts.profileId)
      .eq("kind", "like");
    if (error) return { ok: false, code: "reaction_delete_failed", message: error.message };
  } else {
    const { error } = await client.schema("community").from("reactions").insert({
      post_id: opts.postId,
      profile_id: opts.profileId,
      kind: "like",
    });
    // 并发双击可能撞主键：视为已赞成功，读最新状态即可
    if (error && !error.message.includes("duplicate")) {
      return { ok: false, code: "reaction_insert_failed", message: error.message };
    }
  }

  const { likeCount, likedByViewer } = await getPostEngagement({
    postId: opts.postId,
    viewerProfileId: opts.profileId,
  });
  return { ok: true, liked: likedByViewer, likeCount };
}
