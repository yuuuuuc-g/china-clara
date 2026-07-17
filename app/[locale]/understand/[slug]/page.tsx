import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getPublishedArticle } from "@/src/lib/content/queries";
import { formatDate } from "@/src/lib/format";

/** 读懂中国：文章详情（SSR，consume content 域）。ISR 5 分钟。 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getPublishedArticle({ lang: locale, slug });
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary ?? undefined,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const article = await getPublishedArticle({ lang: locale, slug });
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link href={`/${locale}/understand`} className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white">
        ← {dict.content.backToList}
      </Link>

      <article className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
        {article.publishedAt && (
          <time dateTime={article.publishedAt} className="mt-3 block text-sm text-neutral-400">
            {formatDate(article.publishedAt, locale)}
          </time>
        )}

        {!article.humanReviewed && (
          <p className="mt-4 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
            {dict.content.aiDraftNotice}
          </p>
        )}

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.bodyMd}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
