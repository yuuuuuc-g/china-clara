/**
 * /api/v1/community/posts/[slug]/comments — 帖子评论。
 * GET 公开；POST 需 community:write，作者一律取 PAT 所有者。
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/src/lib/api/response";
import { authenticatePat } from "@/src/lib/api/auth";
import { getPublishedPost } from "@/src/lib/community/queries";
import { addComment, listComments } from "@/src/lib/community/interactions";

const CommentSchema = z.object({
  body: z.string().min(2).max(2000),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPublishedPost({ slug });
  if (!post) return fail("not_found", "Post not found", 404);

  const comments = await listComments(post.id);
  return ok(comments, { total: comments.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticatePat(req, "community:write");
  if (!auth.ok || !auth.ownerProfileId) {
    return fail("unauthorized", auth.reason ?? "unauthorized", 401);
  }

  const { slug } = await params;
  const post = await getPublishedPost({ slug });
  if (!post) return fail("not_found", "Post not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = CommentSchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_body", parsed.error.issues.map((i) => i.message).join("; "), 422);
  }

  const result = await addComment({
    postId: post.id,
    authorProfileId: auth.ownerProfileId,
    body: parsed.data.body,
  });
  if (!result.ok) {
    return fail(result.code, result.message, result.code === "not_found" ? 404 : 500);
  }
  return ok({ id: result.id }, {}, 201);
}
