"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionProfile } from "@/src/lib/auth/session";
import { addInquiryMessage, createInquiry } from "@/src/lib/crm/inquiries";
import { isLocale } from "@/src/i18n/config";

/**
 * 询盘中心 server actions。身份一律来自 cookie 会话（getSessionProfile），
 * 不信任表单里的任何 profile id。业务规则收敛在 src/lib/crm/inquiries.ts。
 */

const CreateSchema = z.object({
  locale: z.string().refine(isLocale),
  product_id: z.string().uuid(),
  product_slug: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  target_port: z.string().max(120).optional(),
  message: z.string().min(10).max(5000),
});

export async function createInquiryAction(formData: FormData): Promise<void> {
  const parsed = CreateSchema.safeParse({
    locale: formData.get("locale"),
    product_id: formData.get("product_id"),
    product_slug: formData.get("product_slug"),
    quantity: formData.get("quantity"),
    target_port: formData.get("target_port") ?? undefined,
    message: formData.get("message"),
  });
  if (!parsed.success) {
    // 表单本身有 required/min 校验，走到这里通常是绕过了浏览器校验
    redirect(`/${formData.get("locale") ?? "es"}/inquiries`);
  }
  const { locale, product_id, product_slug, quantity, target_port, message } = parsed.data;

  const session = await getSessionProfile();
  if (!session) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/inquiries/new?product=${product_slug}`)}`);
  }

  const result = await createInquiry({
    buyerProfileId: session.userId,
    productId: product_id,
    quantity,
    targetPort: target_port ?? null,
    message,
  });
  if (!result.ok) {
    console.error("[inquiries.actions] createInquiry failed:", result.code, result.message);
    redirect(`/${locale}/inquiries/new?product=${product_slug}&error=${result.code}`);
  }

  revalidatePath(`/${locale}/inquiries`);
  redirect(`/${locale}/inquiries/${result.id}`);
}

const ReplySchema = z.object({
  locale: z.string().refine(isLocale),
  inquiry_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function addMessageAction(formData: FormData): Promise<void> {
  const parsed = ReplySchema.safeParse({
    locale: formData.get("locale"),
    inquiry_id: formData.get("inquiry_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    redirect(`/${formData.get("locale") ?? "es"}/inquiries`);
  }
  const { locale, inquiry_id, body } = parsed.data;
  const threadPath = `/${locale}/inquiries/${inquiry_id}`;

  const session = await getSessionProfile();
  if (!session) {
    redirect(`/${locale}/login?next=${encodeURIComponent(threadPath)}`);
  }

  const result = await addInquiryMessage({
    inquiryId: inquiry_id,
    senderProfileId: session.userId,
    body,
  });
  if (!result.ok) {
    console.error("[inquiries.actions] addMessage failed:", result.code, result.message);
  }

  revalidatePath(threadPath);
  redirect(threadPath);
}
