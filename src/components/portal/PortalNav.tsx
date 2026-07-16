"use client";

import Link from "next/link";
import { locales, type Locale } from "@/src/i18n/config";
import { portalDictionary } from "@/src/i18n/portal-dictionary";
import { MODULES } from "@/src/lib/modules";

const LOCALE_LABEL: Record<Locale, string> = { es: "ES", en: "EN", zh: "中文" };

interface PortalNavProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

/**
 * 门户顶栏，始终渲染（3D 与降级模式共用）。
 * 提供品牌、六模块文字导航与语言切换 —— 保证任何设备无 3D 也能使用（铁律 #4）。
 */
export function PortalNav({ locale, onLocaleChange }: PortalNavProps) {
  const dict = portalDictionary(locale);
  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
      <Link href="/" className="text-lg font-semibold tracking-tight text-white">
        China&nbsp;Clara
      </Link>
      <nav
        aria-label="Modules"
        className="order-3 w-full overflow-x-auto sm:order-2 sm:w-auto sm:flex-1"
      >
        <ul className="flex gap-x-5 gap-y-1 whitespace-nowrap text-sm text-white/75">
          {MODULES.map((mod) => (
            <li key={mod.id}>
              <Link
                href={`/${locale}/${mod.slug}`}
                className="transition hover:text-white"
              >
                {dict.nav[mod.navKey]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div
        role="group"
        aria-label={dict.ui.language}
        className="order-2 ml-auto flex items-center gap-1 sm:order-3"
      >
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onLocaleChange(l)}
            aria-pressed={l === locale}
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              l === locale ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {LOCALE_LABEL[l]}
          </button>
        ))}
      </div>
    </header>
  );
}
