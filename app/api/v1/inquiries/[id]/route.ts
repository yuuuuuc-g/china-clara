import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/src/lib/api/response";
import { authenticatePat } from "@/src/lib/api/auth";
import { getInquiryForParty } from "@/src/lib/crm/inquiries";
import { isLocale, defaultLocale, type Locale } from "@/src/i18n/config";

/**
 * GET /api/v1/inquiries/{id} — 询盘详情 + 消息线程（需 inquiries:read）。
 * 仅当事双方可见；无权与不存在统一 404，避免探测。
 */

function langFrom(req: NextRequest): Locale {
  const lang = req.nextUrl.searchParams.get("lang") ?? "";
  return isLocale(lang) ? lang : defaultLocale;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticatePat(req, "inquiries:read");
  if (!auth.ok || !auth.ownerProfileId) {
    return fail("unauthorized", auth.reason ?? "unauthorized", 401);
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("invalid_id", "inquiry id must be a UUID", 422);
  }

  const detail = await getInquiryForParty({
    id,
    viewerProfileId: auth.ownerProfileId,
    lang: langFrom(req),
  });
  if (!detail) return fail("not_found", "Inquiry not found", 404);
  return ok(detail);
}
