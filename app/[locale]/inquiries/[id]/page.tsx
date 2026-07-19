import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getSessionProfile } from "@/src/lib/auth/session";
import { getInquiryForParty } from "@/src/lib/crm/inquiries";
import { formatDateTime } from "@/src/lib/format";
import { InquiryStatusBadge } from "@/src/components/site/InquiryStatusBadge";
import { addMessageAction } from "../actions";
import { MessageTranslation } from "./MessageTranslation";

/** 询盘消息线程（SSR，仅当事双方可见）。 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.crm.myInquiries };
}

export default async function InquiryThreadPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const session = await getSessionProfile();
  if (!session) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/inquiries/${id}`)}`);
  }

  const inquiry = await getInquiryForParty({ id, viewerProfileId: session.userId, lang: locale });
  if (!inquiry) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href={`/${locale}/inquiries`}
        className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white"
      >
        ← {dict.crm.backToInquiries}
      </Link>

      <div className="mt-6 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {inquiry.product ? (
            <Link
              href={
                inquiry.product.supplierSlug
                  ? `/${locale}/suppliers/${inquiry.product.supplierSlug}`
                  : `/${locale}/suppliers`
              }
              className="hover:underline"
            >
              {inquiry.product.name}
            </Link>
          ) : (
            dict.crm.productUnavailable
          )}
        </h1>
        <InquiryStatusBadge status={inquiry.status} label={dict.crm.status[inquiry.status]} />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
        {inquiry.product?.supplierName && (
          <span>
            {dict.crm.supplier}: {inquiry.product.supplierName}
          </span>
        )}
        <span>
          {dict.crm.quantity}: {inquiry.quantity.toLocaleString()}
        </span>
        {inquiry.targetPort && (
          <span>
            {dict.crm.targetPort}: {inquiry.targetPort}
          </span>
        )}
      </div>

      <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-xs leading-relaxed text-neutral-500 dark:bg-neutral-900">
        {dict.crm.noPayments}
      </p>

      <ul className="mt-8 space-y-4">
        {inquiry.messages.map((msg) => {
          const mine = msg.senderProfileId === session.userId;
          return (
            <li key={msg.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[70%] ${
                  mine
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                {!mine && (
                  <MessageTranslation
                    messageId={msg.id}
                    locale={locale}
                    initialText={msg.translatedLang === locale ? msg.bodyTranslated : null}
                    labels={{
                      translate: dict.crm.translate,
                      hideTranslation: dict.crm.hideTranslation,
                      translating: dict.crm.translating,
                      translationFailed: dict.crm.translationFailed,
                      machineTranslated: dict.crm.machineTranslated,
                    }}
                  />
                )}
                <p className={`mt-1.5 text-[11px] ${mine ? "opacity-60" : "text-neutral-500"}`}>
                  {mine
                    ? dict.crm.you
                    : inquiry.viewerRole === "buyer"
                      ? dict.crm.supplier
                      : dict.crm.buyer}
                  {" · "}
                  {formatDateTime(msg.createdAt, locale)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <form action={addMessageAction} className="mt-8">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="inquiry_id" value={inquiry.id} />
        <textarea
          name="body"
          required
          minLength={1}
          maxLength={5000}
          rows={3}
          placeholder={dict.crm.messagePlaceholder}
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
        <button
          type="submit"
          className="mt-3 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {dict.crm.send}
        </button>
      </form>
    </div>
  );
}
