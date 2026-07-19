import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getSessionProfile } from "@/src/lib/auth/session";
import { createPostAction } from "../actions";

/** 社区发帖页（SSR 登录表单，提交后进入审核）。 */
export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

export default async function NewCommunityPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { error } = await searchParams;

  const session = await getSessionProfile();
  if (!session) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/community/new`)}`
    );
  }

  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href={`/${locale}/community`}
        className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white"
      >
        ← {dict.community.backToList}
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
        {dict.community.writePost}
      </h1>

      <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
        {dict.community.reviewNotice}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {dict.auth.genericError}
        </p>
      )}

      <form action={createPostAction} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="lang" value={locale} />

        <label className="block text-sm font-medium">
          {dict.community.postTitle}
          <input
            type="text"
            name="title"
            required
            minLength={4}
            maxLength={160}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          {dict.community.postBody}
          <textarea
            name="body_md"
            required
            minLength={20}
            maxLength={20000}
            rows={12}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {dict.community.submit}
        </button>
      </form>
    </div>
  );
}
