import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/src/lib/api/response";
import { authenticatePat } from "@/src/lib/api/auth";
import { createInquiry, listInquiriesForBuyer } from "@/src/lib/crm/inquiries";
import { isLocale, defaultLocale, type Locale } from "@/src/i18n/config";

/**
 * /api/v1/inquiries — 询盘（外部项目经 PAT 接入）。
 * 铁律：平台没有订单，只有询盘。支付由买卖双方自行商议。
 * 身份一律取自 PAT 所有者（owner_profile_id），不信任请求体里的 profile id。
 */

const InquirySchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  target_port: z.string().min(2).max(120).optional(),
  message: z.string().min(10).max(5000),
});

function langFrom(req: NextRequest): Locale {
  const lang = req.nextUrl.searchParams.get("lang") ?? "";
  return isLocale(lang) ? lang : defaultLocale;
}

/** GET /api/v1/inquiries — 我的询盘列表（需 inquiries:read） */
export async function GET(req: NextRequest) {
  const auth = await authenticatePat(req, "inquiries:read");
  if (!auth.ok || !auth.ownerProfileId) {
    return fail("unauthorized", auth.reason ?? "unauthorized", 401);
  }

  const page = Number(req.nextUrl.searchParams.get("page") ?? "1") || 1;
  const perPage = Number(req.nextUrl.searchParams.get("per_page") ?? "20") || 20;
  const { items, total, ...rest } = await listInquiriesForBuyer({
    buyerProfileId: auth.ownerProfileId,
    lang: langFrom(req),
    page,
    perPage,
  });
  return ok(items, { total, ...rest });
}

/** POST /api/v1/inquiries — 发起询盘（需 inquiries:write） */
export async function POST(req: NextRequest) {
  const auth = await authenticatePat(req, "inquiries:write");
  if (!auth.ok || !auth.ownerProfileId) {
    return fail("unauthorized", auth.reason ?? "unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = InquirySchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_body", parsed.error.issues.map((i) => i.message).join("; "), 422);
  }

  const result = await createInquiry({
    buyerProfileId: auth.ownerProfileId,
    productId: parsed.data.product_id,
    quantity: parsed.data.quantity,
    targetPort: parsed.data.target_port ?? null,
    message: parsed.data.message,
  });
  if (!result.ok) {
    const status = result.code === "product_not_found" ? 404 : 500;
    return fail(result.code, result.message, status);
  }
  return ok({ id: result.id, created_at: result.createdAt }, {}, 201);
}
