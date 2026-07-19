import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getPublishedPost } from "@/src/lib/community/queries";
import { formatDate } from "@/src/lib/format";

/** 社区文章详情（SSR，ISR 五分钟）。 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = await getPublishedPost({ slug });
  if (!post) return {};
  return { title: post.title };
}

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const post = await getPublishedPost({ slug });
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href={`/${locale}/community`}
        className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white"
      >
        ← {dict.community.backToList}
      </Link>

      <article className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
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

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.bodyMd}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
