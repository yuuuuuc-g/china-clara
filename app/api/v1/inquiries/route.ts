import type { NextRequest } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/src/lib/supabase/service";
import { ok, fail } from "@/src/lib/api/response";
import { authenticatePat } from "@/src/lib/api/auth";

/**
 * POST /api/v1/inquiries — 发起询盘（需 inquiries:write）
 * 铁律：平台没有订单，只有询盘。支付由买卖双方自行商议。
 */

const InquirySchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  target_port: z.string().min(2).max(120).optional(),
  message: z.string().min(10).max(5000),
  buyer_profile_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticatePat(req, "inquiries:write");
  if (!auth.ok) return fail("unauthorized", auth.reason ?? "unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = InquirySchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_body", parsed.error.issues.map((i) => i.message).join("; "), 422);
  }

  const { data, error } = await serviceClient()
    .schema("crm")
    .from("inquiries")
    .insert({
      product_id: parsed.data.product_id,
      buyer_profile_id: parsed.data.buyer_profile_id,
      quantity: parsed.data.quantity,
      target_port: parsed.data.target_port ?? null,
      status: "open",
    })
    .select("id, created_at")
    .single();

  if (error) return fail("insert_failed", error.message, 500);

  await serviceClient().schema("crm").from("inquiry_messages").insert({
    inquiry_id: data.id,
    sender_profile_id: parsed.data.buyer_profile_id,
    body: parsed.data.message,
  });

  // TODO(P3): 触发 webhook 事件 inquiry.created
  return ok(data, {}, 201);
}
