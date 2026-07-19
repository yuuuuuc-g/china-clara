import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getSessionProfile } from "@/src/lib/auth/session";
import { LoginForm } from "./LoginForm";

/** 登录 / 注册（最小认证闭环：邮箱 + 密码）。已登录则直接去目标页。 */
export const dynamic = "force-dynamic";

/** 只允许站内相对路径，防开放重定向。 */
function safeNext(raw: string | undefined, locale: Locale): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return `/${locale}/inquiries`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.auth.signIn };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { next } = await searchParams;
  const nextPath = safeNext(next, locale);

  const session = await getSessionProfile();
  if (session) redirect(nextPath);

  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{dict.auth.signIn}</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {dict.auth.loginRequired}
      </p>
      <LoginForm locale={locale} nextPath={nextPath} labels={dict.auth} />
    </div>
  );
}
