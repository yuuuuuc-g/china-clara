import type { NextRequest } from "next/server";
import { serviceClient } from "@/src/lib/supabase/service";
import { ok, fail } from "@/src/lib/api/response";
import { isLocale } from "@/src/i18n/config";

/** GET /api/v1/catalog/products?category=textiles&lang=en&page=1 — 公开目录 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "es";
  const category = searchParams.get("category");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Number(searchParams.get("per_page") ?? 20));

  if (!isLocale(lang)) return fail("invalid_lang", "lang must be es|en|zh");

  let query = serviceClient()
    .schema("catalog")
    .from("products")
    .select(
      "id, slug, moq, price_min_usd, price_max_usd, supplier:suppliers(id, company_name, verification_status), translation:product_translations!inner(name, description, lang), category:categories(slug)",
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("product_translations.lang", lang)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (category) query = query.eq("categories.slug", category);

  const { data, error, count } = await query;
  if (error) return fail("query_failed", error.message, 500);
  return ok(data, { page, perPage, total: count ?? 0 });
}
