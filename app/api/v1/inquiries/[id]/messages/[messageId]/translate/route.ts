import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/src/lib/api/response";
import { authenticatePat } from "@/src/lib/api/auth";
import { serviceClient } from "@/src/lib/supabase/service";
import { translateInquiryMessage } from "@/src/lib/crm/translate";
import { isLocale } from "@/src/i18n/config";

/**
 * POST /api/v1/inquiries/{id}/messages/{messageId}/translate —
 * 消息一键翻译（需 inquiries:read：翻译属于「用自己的语言读线程」，缓存写入是副作用）。
 * 仅当事双方；译文缓存在 body_translated / translated_lang。
 */

const BodySchema = z.object({
  target_lang: z.string().refine(isLocale, "target_lang must be one of es|en|zh"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const auth = await authenticatePat(req, "inquiries:read");
  if (!auth.ok || !auth.ownerProfileId) {
    return fail("unauthorized", auth.reason ?? "unauthorized", 401);
  }

  const { id, messageId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(messageId).success) {
    return fail("invalid_id", "inquiry id and message id must be UUIDs", 422);
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_body", parsed.error.issues.map((i) => i.message).join("; "), 422);
  }

  // 校验消息确实挂在路径里的询盘下，避免跨线程指涉
  const { data: message } = await serviceClient()
    .schema("crm")
    .from("inquiry_messages")
    .select("id, inquiry_id")
    .eq("id", messageId)
    .maybeSingle();
  if (!message || message.inquiry_id !== id) {
    return fail("not_found", "Message not found", 404);
  }

  const result = await translateInquiryMessage({
    messageId,
    viewerProfileId: auth.ownerProfileId,
    targetLang: parsed.data.target_lang,
  });
  if (!result.ok) {
    const status =
      result.code === "not_found" ? 404 : result.code === "ai_not_configured" ? 503 : 500;
    return fail(result.code, result.message, status);
  }
  return ok({
    message_id: messageId,
    target_lang: parsed.data.target_lang,
    body_translated: result.text,
    cached: result.cached,
  });
}
