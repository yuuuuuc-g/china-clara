import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getSessionProfile } from "@/src/lib/auth/session";
import { getPublishedProductBySlug } from "@/src/lib/catalog/queries";
import { createInquiryAction } from "../actions";

/** 发起询盘（SSR 表单，会话相关，不缓存）。入口：商品卡片的「询价」。 */
export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.crm.newInquiry };
}

export default async function NewInquiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { product: productSlug, error } = await searchParams;
  if (!productSlug) notFound();

  const dict = await getDictionary(locale);

  const session = await getSessionProfile();
  if (!session) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/inquiries/new?product=${productSlug}`)}`
    );
  }

  const product = await getPublishedProductBySlug({ lang: locale, slug: productSlug });
  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
          {dict.crm.productUnavailable}
        </p>
        <Link
          href={`/${locale}/suppliers`}
          className="mt-6 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← {dict.catalog.backToSuppliers}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8 sm:py-16">
      {product.supplierSlug && (
        <Link
          href={`/${locale}/suppliers/${product.supplierSlug}`}
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white"
        >
          ← {product.supplierName}
        </Link>
      )}

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{dict.crm.newInquiry}</h1>

      <div className="mt-6 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <p className="text-sm text-neutral-500">{dict.crm.product}</p>
        <p className="mt-1 text-base font-medium">{product.name}</p>
        {product.supplierName && (
          <p className="mt-1 text-sm text-neutral-500">
            {dict.crm.supplier}: {product.supplierName}
          </p>
        )}
        {product.moq !== null && (
          <p className="mt-1 text-sm text-neutral-500">
            {dict.catalog.moq}: {product.moq.toLocaleString()}
          </p>
        )}
      </div>

      <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-xs leading-relaxed text-neutral-500 dark:bg-neutral-900">
        {dict.crm.noPayments}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {dict.auth.genericError}
        </p>
      )}

      <form action={createInquiryAction} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="product_slug" value={product.slug} />

        <label className="block text-sm font-medium">
          {dict.crm.quantity}
          <input
            type="number"
            name="quantity"
            required
            min={1}
            step={1}
            defaultValue={product.moq ?? undefined}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          {dict.crm.targetPort} <span className="font-normal text-neutral-500">({dict.crm.optional})</span>
          <input type="text" name="target_port" maxLength={120} className={inputClass} />
        </label>

        <label className="block text-sm font-medium">
          {dict.crm.message}
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            placeholder={dict.crm.messagePlaceholder}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {dict.crm.send}
        </button>
      </form>
    </div>
  );
}
