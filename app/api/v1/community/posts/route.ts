/**
 * /api/v1/community/posts — 公开社区文章列表与 PAT 鉴权发帖接口。
 * 发帖身份一律取自 PAT 所有者，不信任请求体里的 profile id。
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/src/lib/api/response";
import { authenticatePat } from "@/src/lib/api/auth";
import { createPost, listPublishedPosts } from "@/src/lib/community/queries";
import { isLocale, type Locale } from "@/src/i18n/config";

const CommunityPostSchema = z.object({
  lang: z.custom<Locale>((value) => typeof value === "string" && isLocale(value)),
  title: z.string().min(4).max(160),
  body_md: z.string().min(20).max(20000),
});

/** GET /api/v1/community/posts — 已发布社区文章列表（公开） */
export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") ?? "1") || 1;
  const perPage = Number(req.nextUrl.searchParams.get("per_page") ?? "20") || 20;
  const { items, total, ...meta } = await listPublishedPosts({ page, perPage });
  return ok(items, { total, ...meta });
}

/** POST /api/v1/community/posts — 发布社区文章（需 community:write） */
export async function POST(req: NextRequest) {
  const auth = await authenticatePat(req, "community:write");
  if (!auth.ok || !auth.ownerProfileId) {
    return fail("unauthorized", auth.reason ?? "unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = CommunityPostSchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_body", parsed.error.issues.map((i) => i.message).join("; "), 422);
  }

  const result = await createPost({
    authorProfileId: auth.ownerProfileId,
    lang: parsed.data.lang,
    title: parsed.data.title,
    bodyMd: parsed.data.body_md,
  });
  if (!result.ok) {
    return fail(result.code, result.message, 500);
  }
  return ok({ id: result.id, slug: result.slug }, {}, 201);
}
