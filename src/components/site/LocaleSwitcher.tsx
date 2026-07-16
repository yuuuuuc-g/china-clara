"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, isLocale, type Locale } from "@/src/i18n/config";

const LOCALE_LABEL: Record<Locale, string> = { es: "ES", en: "EN", zh: "中文" };

/** 语言切换：保留当前子路径，仅替换首段 locale。 */
export function LocaleSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname() ?? `/${current}`;

  function hrefFor(target: Locale): string {
    const segments = pathname.split("/");
    // segments[0] === "" (leading slash); segments[1] 是当前 locale。
    if (isLocale(segments[1])) {
      segments[1] = target;
    } else {
      return `/${target}`;
    }
    return segments.join("/") || `/${target}`;
  }

  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      {locales.map((l) => (
        <Link
          key={l}
          href={hrefFor(l)}
          aria-current={l === current ? "true" : undefined}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            l === current
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          {LOCALE_LABEL[l]}
        </Link>
      ))}
    </div>
  );
}
