import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { MODULES } from "@/src/lib/modules";

/**
 * 六大模块的通用 SSR 落地页（占位，待各模块建成真实页面后逐一替换）。
 * 现阶段保证门户/导航链接全部可达且三语可读（双轨 UI 铁律 #4）。
 * 注意：已有专属路由的模块（如 understand → /[locale]/understand）由更具体的
 * 静态段接管，这里从 generateStaticParams 排除，避免重复预渲染冲突。
 */

const DEDICATED_SLUGS = new Set(["understand", "suppliers", "inquiries", "community"]);
const GENERIC_MODULES = MODULES.filter((mod) => !DEDICATED_SLUGS.has(mod.slug));

export function generateStaticParams() {
  return locales.flatMap((locale) => GENERIC_MODULES.map((mod) => ({ locale, module: mod.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; module: string }>;
}): Promise<Metadata> {
  const { locale, module } = await params;
  const mod = MODULES.find((m) => m.slug === module);
  if (!isLocale(locale) || !mod) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav[mod.navKey], description: dict.modules[mod.id].blurb };
}

export default async function ModuleLandingPage({
  params,
}: {
  params: Promise<{ locale: string; module: string }>;
}) {
  const { locale, module } = await params;
  const mod = MODULES.find((m) => m.slug === module);
  if (!isLocale(locale) || !mod) notFound();
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <span aria-hidden className="mb-4 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: mod.planet.color }} />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{dict.nav[mod.navKey]}</h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
        {dict.modules[mod.id].blurb}
      </p>

      {mod.id === "developers" && (
        <div className="mt-8 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            OpenAPI 3.1 · <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">/api/v1</code>
          </p>
          <ul className="mt-3 space-y-1 font-mono text-xs text-neutral-500">
            <li>GET /api/v1/content/articles</li>
            <li>GET /api/v1/catalog/products</li>
            <li>POST /api/v1/inquiries</li>
          </ul>
          <Link
            href="/api/v1/openapi"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            openapi.yaml →
          </Link>
        </div>
      )}

      <p className="mt-10 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
        {dict.ui.comingSoon}
      </p>
    </div>
  );
}
