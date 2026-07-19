import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { listPublishedPosts } from "@/src/lib/community/queries";
import { formatDate } from "@/src/lib/format";
import { getModule } from "@/src/lib/modules";

/** 社区文章列表（SSR，展示已审核发布的用户文章）。 */
export const dynamic = "force-dynamic";

const MODULE = getModule("community");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.nav.community,
    description: dict.modules.community.blurb,
  };
}

export default async function CommunityListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { submitted } = await searchParams;
  const dict = await getDictionary(locale);
  const { items } = await listPublishedPosts();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <span
            aria-hidden
            className="mb-4 inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: MODULE.planet.color }}
          />
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {dict.nav.community}
          </h1>
          <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
            {dict.modules.community.blurb}
          </p>
        </div>
        <Link
          href={`/${locale}/community/new`}
          className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {dict.community.writePost}
        </Link>
      </div>

      {submitted && (
        <p className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          {dict.community.submittedNotice}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-10 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
          {dict.community.empty}
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((post) => (
            <li key={post.id} className="py-5">
              <h2 className="text-lg font-medium">
                <Link
                  href={`/${locale}/community/${post.slug}`}
                  className="transition hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {post.excerpt}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                {post.authorName && <span>{post.authorName}</span>}
                {post.authorName && post.publishedAt && <span aria-hidden>·</span>}
                {post.publishedAt && (
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                )}
                {(post.authorName || post.publishedAt) && <span aria-hidden>·</span>}
                <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500 dark:border-neutral-700">
                  {post.lang}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
