import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getSupplierBySlug, type SupplierProduct } from "@/src/lib/catalog/queries";

/** 供应商详情（SSR，含其已发布商品）。ISR 5 分钟。 */
export const revalidate = 300;

function priceLabel(p: SupplierProduct, locale: Locale, onRequest: string): string {
  if (p.priceMinUsd === null && p.priceMaxUsd === null) return onRequest;
  const fmt = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const lo = p.priceMinUsd !== null ? fmt.format(p.priceMinUsd) : null;
  const hi = p.priceMaxUsd !== null ? fmt.format(p.priceMaxUsd) : null;
  if (lo && hi && lo !== hi) return `${lo} – ${hi}`;
  return lo ?? hi ?? onRequest;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const supplier = await getSupplierBySlug({ lang: locale, slug });
  if (!supplier) return {};
  return { title: supplier.companyName };
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const supplier = await getSupplierBySlug({ lang: locale, slug });
  if (!supplier) notFound();

  const meta = [
    supplier.foundedYear ? `${dict.catalog.founded} ${supplier.foundedYear}` : null,
    supplier.employeesRange ? `${dict.catalog.employees}: ${supplier.employeesRange}` : null,
    [supplier.city, supplier.province].filter(Boolean).join(", ") || null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link href={`/${locale}/suppliers`} className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white">
        ← {dict.catalog.backToSuppliers}
      </Link>

      <div className="mt-6 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{supplier.companyName}</h1>
        <span className="mt-1 shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
          {dict.catalog.verified}
        </span>
      </div>

      {meta.length > 0 && (
        <p className="mt-3 text-sm text-neutral-500">{meta.join(" · ")}</p>
      )}

      {supplier.website && (
        <p className="mt-2 text-sm">
          <span className="text-neutral-500">{dict.catalog.website}: </span>
          <a href={supplier.website} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 hover:underline dark:text-blue-400">
            {supplier.website.replace(/^https?:\/\//, "")}
          </a>
        </p>
      )}

      {supplier.certifications.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {supplier.certifications.map((c, i) => (
            <span key={i} className="rounded border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
              {c.kind}
              {c.verified ? " ✓" : ""}
            </span>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-xl font-semibold">{dict.catalog.products}</h2>
      {supplier.products.length === 0 ? (
        <p className="mt-3 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
          {dict.catalog.noProducts}
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {supplier.products.map((p) => (
            <li key={p.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
              <h3 className="text-base font-medium">{p.name}</h3>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{p.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                <span>{priceLabel(p, locale, dict.catalog.priceOnRequest)}</span>
                {p.moq !== null && <span>{dict.catalog.moq}: {p.moq}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
