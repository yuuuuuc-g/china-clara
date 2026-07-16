import type { NextRequest } from "next/server";
import { serviceClient } from "@/src/lib/supabase/service";
import { ok, fail } from "@/src/lib/api/response";
import { isLocale } from "@/src/i18n/config";

/**
 * GET /api/v1/content/articles?lang=es&topic=macro&page=1
 * 公开接口（内容 SEO 要求公开），无需鉴权。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "es";
  const topic = searchParams.get("topic");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Number(searchParams.get("per_page") ?? 20));

  if (!isLocale(lang)) return fail("invalid_lang", "lang must be es|en|zh");

  let query = serviceClient()
    .schema("content")
    .from("articles")
    .select(
      "id, slug, published_at, topic:topics(slug), translation:article_translations!inner(title, summary, lang)",
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("article_translations.lang", lang)
    .order("published_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (topic) query = query.eq("topics.slug", topic);

  const { data, error, count } = await query;
  if (error) return fail("query_failed", error.message, 500);
  return ok(data, { page, perPage, total: count ?? 0 });
}
