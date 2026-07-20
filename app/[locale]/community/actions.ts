"use server";

/** 社区发帖 server action：校验会话并创建待审核文章。 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/src/i18n/config";
import { getSessionProfile } from "@/src/lib/auth/session";
import { createPost } from "@/src/lib/community/queries";
import { addComment, toggleLike } from "@/src/lib/community/interactions";

const CreatePostSchema = z.object({
  locale: z.string().refine(isLocale),
  lang: z.string().refine(isLocale),
  title: z.string().min(4).max(160),
  body_md: z.string().min(20).max(20000),
});

export async function createPostAction(formData: FormData): Promise<void> {
  const parsed = CreatePostSchema.safeParse({
    locale: formData.get("locale"),
    lang: formData.get("lang"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
  });
  if (!parsed.success) {
    redirect(`/${formData.get("locale") ?? "es"}/community/new?error=invalid`);
  }
  const { locale, lang, title, body_md } = parsed.data;

  const session = await getSessionProfile();
  if (!session) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/community/new`)}`
    );
  }

  const result = await createPost({
    authorProfileId: session.userId,
    lang,
    title,
    bodyMd: body_md,
  });
  if (!result.ok) {
    console.error("[community.actions] createPost failed:", result.code, result.message);
    redirect(`/${locale}/community/new?error=${result.code}`);
  }

  revalidatePath(`/${locale}/community`);
  redirect(`/${locale}/community?submitted=1`);
}

/**
 * 点赞开关。由 LikeButton 客户端组件直接调用（非表单提交），返回最新状态。
 * 未登录不重定向（避免打断阅读），返回 unauthenticated 由按钮引导登录。
 */
export async function toggleLikeAction(
  postId: string,
  locale: string,
  slug: string
): Promise<{ ok: boolean; code?: string; liked?: boolean; likeCount?: number }> {
  if (!isLocale(locale) || !z.string().uuid().safeParse(postId).success) {
    return { ok: false, code: "invalid" };
  }
  const session = await getSessionProfile();
  if (!session) return { ok: false, code: "unauthenticated" };

  const result = await toggleLike({ postId, profileId: session.userId });
  if (!result.ok) {
    console.error("[community.actions] toggleLike failed:", result.code, result.message);
    return { ok: false, code: result.code };
  }
  revalidatePath(`/${locale}/community/${slug}`);
  return { ok: true, liked: result.liked, likeCount: result.likeCount };
}

const CommentSchema = z.object({
  locale: z.string().refine(isLocale),
  post_id: z.string().uuid(),
  slug: z.string().min(1),
  body: z.string().min(2).max(2000),
});

/** 发表评论（表单提交）。未登录跳登录并回跳到帖子。 */
export async function addCommentAction(formData: FormData): Promise<void> {
  const parsed = CommentSchema.safeParse({
    locale: formData.get("locale"),
    post_id: formData.get("post_id"),
    slug: formData.get("slug"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    redirect(`/${formData.get("locale") ?? "es"}/community`);
  }
  const { locale, post_id, slug, body } = parsed.data;
  const postPath = `/${locale}/community/${slug}`;

  const session = await getSessionProfile();
  if (!session) {
    redirect(`/${locale}/login?next=${encodeURIComponent(postPath)}`);
  }

  const result = await addComment({ postId: post_id, authorProfileId: session.userId, body });
  if (!result.ok) {
    console.error("[community.actions] addComment failed:", result.code, result.message);
  }
  revalidatePath(postPath);
  redirect(`${postPath}#comments`);
}
