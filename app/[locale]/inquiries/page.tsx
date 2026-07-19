import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/src/i18n/config";
import { getDictionary, type Dictionary } from "@/src/i18n/get-dictionary";
import { getSessionProfile } from "@/src/lib/auth/session";
import { listInquiriesForBuyer } from "@/src/lib/crm/inquiries";
import { formatDate } from "@/src/lib/format";
import { SignOutButton } from "@/src/components/site/SignOutButton";
import { InquiryStatusBadge } from "@/src/components/site/InquiryStatusBadge";

/** 我的询盘列表（SSR，会话相关，不缓存）。 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.crm.myInquiries, description: dict.modules.inquiries.blurb };
}

function LoginGate({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <div className="mt-10 rounded-2xl border border-neutral-200 p-8 text-center dark:border-neutral-800">
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {dict.auth.loginRequired}
      </p>
      <Link
        href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/inquiries`)}`}
        className="mt-5 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {dict.auth.signIn}
      </Link>
    </div>
  );
}

export default async function InquiriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const session = await getSessionProfile();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{dict.crm.myInquiries}</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {dict.modules.inquiries.blurb}
          </p>
        </div>
        {session && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="max-w-48 truncate text-xs text-neutral-500">
              {session.displayName ?? session.email}
            </span>
            <SignOutButton label={dict.auth.signOut} />
          </div>
        )}
      </div>

      {!session ? (
        <LoginGate locale={locale} dict={dict} />
      ) : (
        <InquiryList locale={locale} dict={dict} buyerProfileId={session.userId} />
      )}
    </div>
  );
}

async function InquiryList({
  locale,
  dict,
  buyerProfileId,
}: {
  locale: Locale;
  dict: Dictionary;
  buyerProfileId: string;
}) {
  const { items } = await listInquiriesForBuyer({ buyerProfileId, lang: locale });

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-neutral-200 p-8 text-center dark:border-neutral-800">
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{dict.crm.empty}</p>
        <Link
          href={`/${locale}/suppliers`}
          className="mt-5 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {dict.crm.browseSuppliers}
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 space-y-4">
      {items.map((inq) => (
        <li key={inq.id}>
          <Link
            href={`/${locale}/inquiries/${inq.id}`}
            className="block rounded-2xl border border-neutral-200 p-5 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-medium">
                {inq.product?.name ?? dict.crm.productUnavailable}
              </h2>
              <InquiryStatusBadge status={inq.status} label={dict.crm.status[inq.status]} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
              {inq.product?.supplierName && (
                <span>
                  {dict.crm.supplier}: {inq.product.supplierName}
                </span>
              )}
              <span>
                {dict.crm.quantity}: {inq.quantity.toLocaleString()}
              </span>
              <span>{formatDate(inq.updatedAt, locale)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
