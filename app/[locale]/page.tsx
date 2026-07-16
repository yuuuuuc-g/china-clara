import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { MODULES } from "@/src/lib/modules";

/** SSR 公开首页（SEO 生命线）。3D 星系门户保留在根路径 /。 */
export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {dict.tagline}
      </h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <Link
            key={mod.id}
            href={`/${locale}/${mod.slug}`}
            className="group flex flex-col rounded-2xl border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <span aria-hidden className="mb-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mod.planet.color }} />
            <h2 className="text-base font-semibold">{dict.nav[mod.navKey]}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {dict.modules[mod.id].blurb}
            </p>
            <span className="mt-3 text-sm text-neutral-400 transition group-hover:text-neutral-900 dark:group-hover:text-white">
              {dict.ui.enter} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
