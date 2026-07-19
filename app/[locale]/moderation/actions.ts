"use server";

/**
 * 审核队列的 server actions。
 *
 * 代码中看不出来的约束：
 * - server action 可被任意请求直接触发，不信任页面层的角色门禁，
 *   每次调用都必须在此重新校验会话与角色；
 * - 参数非法与权限不足都不向前端抛错，一律 redirect 了事；
 * - 查询层返回 ok:false 时仅记录日志、不中断流程，最终统一回到审核队列页，
 *   由 revalidate 后重新拉取的列表反映真实状态（失败的条目仍在队列中，可重试）。
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isLocale } from "@/src/i18n/config";
import { getSessionProfile } from "@/src/lib/auth/session";
import {
  approvePost,
  approveSupplier,
  rejectPost,
  rejectSupplier,
} from "@/src/lib/moderation/queries";

const postDecisionSchema = z.object({
  locale: z.string().refine(isLocale),
  post_id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

const supplierDecisionSchema = z.object({
  locale: z.string().refine(isLocale),
  supplier_id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export async function moderatePostAction(formData: FormData): Promise<void> {
  const parsed = postDecisionSchema.safeParse({
    locale: formData.get("locale"),
    post_id: formData.get("post_id"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) {
    redirect(`/${formData.get("locale") ?? "es"}/moderation`);
  }

  const { locale, post_id: postId, decision } = parsed.data;

  const session = await getSessionProfile();
  if (!session || (session.role !== "editor" && session.role !== "admin")) {
    redirect(`/${locale}`);
  }

  const result =
    decision === "approve"
      ? await approvePost({ postId })
      : await rejectPost({ postId });
  if (!result.ok) {
    console.error(`[moderation.actions] post ${decision} failed`, result.code, result.message);
  }

  revalidatePath(`/${locale}/moderation`);
  revalidatePath(`/${locale}/community`);
  redirect(`/${locale}/moderation`);
}

export async function moderateSupplierAction(formData: FormData): Promise<void> {
  const parsed = supplierDecisionSchema.safeParse({
    locale: formData.get("locale"),
    supplier_id: formData.get("supplier_id"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) {
    redirect(`/${formData.get("locale") ?? "es"}/moderation`);
  }

  const { locale, supplier_id: supplierId, decision } = parsed.data;

  const session = await getSessionProfile();
  if (!session || (session.role !== "editor" && session.role !== "admin")) {
    redirect(`/${locale}`);
  }

  const result =
    decision === "approve"
      ? await approveSupplier({ supplierId })
      : await rejectSupplier({ supplierId });
  if (!result.ok) {
    console.error(`[moderation.actions] supplier ${decision} failed`, result.code, result.message);
  }

  revalidatePath(`/${locale}/moderation`);
  revalidatePath(`/${locale}/suppliers`);
  redirect(`/${locale}/moderation`);
}
