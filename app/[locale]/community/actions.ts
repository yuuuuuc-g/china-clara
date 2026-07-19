"use server";

/** 社区发帖 server action：校验会话并创建待审核文章。 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/src/i18n/config";
import { getSessionProfile } from "@/src/lib/auth/session";
import { createPost } from "@/src/lib/community/queries";

const CreatePostSchema = z.object({
  locale: z.string().refine(isLocale),
  lang: z.string().refine(isLocale),
  title: z.string().min(4).max(160),
  body_md: z.string().min(20).max(20000),
});

export async function createPostAction(formData: FormData): Promise<void> {
  const parsed = CreatePostSchema.safeParse({
    locale: formData.get("locale"),
    lang: formData.get("lang"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
  });
  if (!parsed.success) {
    redirect(`/${formData.get("locale") ?? "es"}/community/new?error=invalid`);
  }
  const { locale, lang, title, body_md } = parsed.data;

  const session = await getSessionProfile();
  if (!session) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/community/new`)}`
    );
  }

  const result = await createPost({
    authorProfileId: session.userId,
    lang,
    title,
    bodyMd: body_md,
  });
  if (!result.ok) {
    console.error("[community.actions] createPost failed:", result.code, result.message);
    redirect(`/${locale}/community/new?error=${result.code}`);
  }

  revalidatePath(`/${locale}/community`);
  redirect(`/${locale}/community?submitted=1`);
}
