/**
 * 情报雷达模块页（/[locale]/intelligence）：展示最新抓取的中拉贸易情报信号。
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { listRecentSignals } from "@/src/lib/content/intel";
import { formatDate } from "@/src/lib/format";
import { getModule } from "@/src/lib/modules";

/** 公开内容，ISR 5 分钟。 */
export const revalidate = 300;

const MODULE = getModule("intelligence");

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.nav.intel,
    description: dict.modules.intelligence.blurb,
  };
}

export default async function IntelligencePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  // 查询层自带优雅降级：失败时 items 为空数组，页面进入空状态。
  const { items } = await listRecentSignals();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <span
        aria-hidden
        className="mb-4 inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: MODULE.planet.color }}
      />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{dict.nav.intel}</h1>
      <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
        {dict.modules.intelligence.blurb}
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
          {dict.intel.empty}
        </div>
      ) : (
        <>
          <h2 className="mt-10 text-xl font-semibold tracking-tight">{dict.intel.latest}</h2>
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {items.map((item) => (
              <li key={item.id} className="py-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium transition hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {item.title} ↗
                </a>
                {item.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {item.excerpt}
                  </p>
                ) : null}
                <p className="mt-1.5 text-xs text-neutral-400">
                  {[item.sourceName, formatDate(item.fetchedAt, locale)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
