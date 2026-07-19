import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/src/lib/api/response";
import { authenticatePat } from "@/src/lib/api/auth";
import { addInquiryMessage } from "@/src/lib/crm/inquiries";

/**
 * POST /api/v1/inquiries/{id}/messages — 在询盘下发消息（需 inquiries:write）。
 * 发送者 = PAT 所有者；仅当事双方可发。
 */

const MessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticatePat(req, "inquiries:write");
  if (!auth.ok || !auth.ownerProfileId) {
    return fail("unauthorized", auth.reason ?? "unauthorized", 401);
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("invalid_id", "inquiry id must be a UUID", 422);
  }

  const body = await req.json().catch(() => null);
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_body", parsed.error.issues.map((i) => i.message).join("; "), 422);
  }

  const result = await addInquiryMessage({
    inquiryId: id,
    senderProfileId: auth.ownerProfileId,
    body: parsed.data.body,
  });
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 500;
    return fail(result.code, result.message, status);
  }
  return ok({ id: result.id, created_at: result.createdAt }, {}, 201);
}
