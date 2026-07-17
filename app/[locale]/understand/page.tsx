import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getModule } from "@/src/lib/modules";
import { listPublishedArticles } from "@/src/lib/content/queries";
import { formatDate } from "@/src/lib/format";

/** 读懂中国：文章列表（SSR，消费 content 域）。ISR 5 分钟。 */
export const revalidate = 300;

const MODULE = getModule("understand");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav[MODULE.navKey], description: dict.modules.understand.blurb };
}

export default async function UnderstandListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const { items } = await listPublishedArticles({ lang: locale });

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <span aria-hidden className="mb-4 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: MODULE.planet.color }} />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{dict.nav[MODULE.navKey]}</h1>
      <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">{dict.modules.understand.blurb}</p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
          {dict.content.articlesEmpty}
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((article) => (
            <li key={article.id} className="py-5">
              <Link href={`/${locale}/understand/${article.slug}`} className="group block">
                <h2 className="text-lg font-medium transition group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {article.title}
                </h2>
                {article.summary && (
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {article.summary}
                  </p>
                )}
                {article.publishedAt && (
                  <time dateTime={article.publishedAt} className="mt-2 block text-xs text-neutral-400">
                    {formatDate(article.publishedAt, locale)}
                  </time>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
