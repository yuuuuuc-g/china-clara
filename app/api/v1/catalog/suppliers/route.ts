import type { NextRequest } from "next/server";
import { ok, fail } from "@/src/lib/api/response";
import { isLocale } from "@/src/i18n/config";
import { listVerifiedSuppliers } from "@/src/lib/catalog/queries";

/**
 * GET /api/v1/catalog/suppliers?lang=es&page=1 — 公开供应商目录（已审核）。
 * 与 SSR 页共用 catalog/queries 层。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "es";
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);

  if (!isLocale(lang)) return fail("invalid_lang", "lang must be es|en|zh");

  const result = await listVerifiedSuppliers({ lang, page, perPage });
  return ok(result.items, { page: result.page, perPage: result.perPage, total: result.total });
}
