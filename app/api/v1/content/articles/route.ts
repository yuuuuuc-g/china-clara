import type { NextRequest } from "next/server";
import { ok, fail } from "@/src/lib/api/response";
import { isLocale } from "@/src/i18n/config";
import { listPublishedArticles } from "@/src/lib/content/queries";

/**
 * GET /api/v1/content/articles?lang=es&topic=macro&page=1
 * 公开接口（内容 SEO 要求公开），无需鉴权。与 SSR 页共用 content/queries 层。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "es";
  const topic = searchParams.get("topic");
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);

  if (!isLocale(lang)) return fail("invalid_lang", "lang must be es|en|zh");

  const result = await listPublishedArticles({ lang, topic, page, perPage });
  return ok(result.items, { page: result.page, perPage: result.perPage, total: result.total });
}
