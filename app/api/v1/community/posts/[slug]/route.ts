/**
 * /api/v1/community/posts/[slug] — 按 slug 获取已发布社区文章详情的公开接口。
 */

import type { NextRequest } from "next/server";
import { ok, fail } from "@/src/lib/api/response";
import { getPublishedPost } from "@/src/lib/community/queries";

/** GET /api/v1/community/posts/[slug] — 已发布社区文章详情（公开） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const detail = await getPublishedPost({ slug });
  if (!detail) {
    return fail("not_found", "Post not found", 404);
  }
  return ok(detail);
}
