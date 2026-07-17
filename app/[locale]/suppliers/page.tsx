import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getModule } from "@/src/lib/modules";
import { listVerifiedSuppliers } from "@/src/lib/catalog/queries";

/** 供应商目录：已审核供应商列表（SSR，消费 catalog 域）。ISR 5 分钟。 */
export const revalidate = 300;

const MODULE = getModule("suppliers");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav[MODULE.navKey], description: dict.modules.suppliers.blurb };
}

export default async function SuppliersListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const { items } = await listVerifiedSuppliers({ lang: locale });

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <span aria-hidden className="mb-4 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: MODULE.planet.color }} />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{dict.nav[MODULE.navKey]}</h1>
      <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">{dict.modules.suppliers.blurb}</p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
          {dict.catalog.suppliersEmpty}
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/${locale}/suppliers/${s.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold transition group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {s.companyName}
                  </h2>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {dict.catalog.verified}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {[s.city, s.province].filter(Boolean).join(", ")}
                  {s.foundedYear ? ` · ${dict.catalog.founded} ${s.foundedYear}` : ""}
                </p>
                {s.membershipTier === "pro" && (
                  <span className="mt-3 inline-block w-fit rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    PRO
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
