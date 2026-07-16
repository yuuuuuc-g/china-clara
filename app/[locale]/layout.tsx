import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { SiteHeader } from "@/src/components/site/SiteHeader";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader locale={locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-neutral-200 px-5 py-6 text-xs text-neutral-500 dark:border-neutral-800 sm:px-8">
        China Clara · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
