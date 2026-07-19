import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getSessionProfile } from "@/src/lib/auth/session";
import { formatDate } from "@/src/lib/format";
import {
  listPendingPosts,
  listPendingSuppliers,
} from "@/src/lib/moderation/queries";

import { moderatePostAction, moderateSupplierAction } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  return {
    title: dict.moderation.title,
    robots: { index: false },
  };
}

export default async function ModerationPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // 未登录或非 editor/admin 一律 404（而非跳转登录）：不对外暴露该页存在
  const session = await getSessionProfile();
  if (!session || (session.role !== "editor" && session.role !== "admin")) {
    notFound();
  }

  const [dict, posts, suppliers] = await Promise.all([
    getDictionary(locale),
    listPendingPosts(),
    listPendingSuppliers(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {dict.moderation.title}
      </h1>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.moderation.postsQueue}
        </h2>
        {posts.length === 0 ? (
          <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
            {dict.moderation.emptyQueue}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {posts.map((post) => (
              <li
                key={post.id}
                className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{post.title}</h3>
                  <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500 dark:border-neutral-700">
                    {post.lang}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {post.excerpt}
                </p>
                <p className="mt-2 text-xs text-neutral-400">
                  {post.authorName ? `${post.authorName} · ` : null}
                  {formatDate(post.createdAt, locale)}
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={moderatePostAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="post_id" value={post.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                      {dict.moderation.approve}
                    </button>
                  </form>
                  <form action={moderatePostAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="post_id" value={post.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button
                      type="submit"
                      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      {dict.moderation.reject}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.moderation.suppliersQueue}
        </h2>
        {suppliers.length === 0 ? (
          <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
            {dict.moderation.emptyQueue}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {suppliers.map((supplier) => (
              <li
                key={supplier.id}
                className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
              >
                <h3 className="font-medium">
                  {supplier.companyName}
                  {supplier.companyNameEn ? (
                    <span className="ml-2 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                      {supplier.companyNameEn}
                    </span>
                  ) : null}
                </h3>
                <p className="mt-2 text-xs text-neutral-400">
                  {formatDate(supplier.createdAt, locale)}
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={moderateSupplierAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="supplier_id" value={supplier.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                      {dict.moderation.approve}
                    </button>
                  </form>
                  <form action={moderateSupplierAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="supplier_id" value={supplier.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button
                      type="submit"
                      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      {dict.moderation.reject}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
