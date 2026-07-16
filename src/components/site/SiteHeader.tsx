import Link from "next/link";
import type { Locale } from "@/src/i18n/config";
import type { Dictionary } from "@/src/i18n/get-dictionary";
import { MODULES } from "@/src/lib/modules";
import { LocaleSwitcher } from "@/src/components/site/LocaleSwitcher";

/** SSR 内容页顶栏：品牌（回 3D 门户）、六模块导航、语言切换。 */
export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-8">
        <Link href="/" className="text-base font-semibold tracking-tight">
          China&nbsp;Clara
        </Link>
        <nav aria-label="Modules" className="order-3 w-full overflow-x-auto sm:order-2 sm:w-auto sm:flex-1">
          <ul className="flex gap-x-5 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
            {MODULES.map((mod) => (
              <li key={mod.id}>
                <Link href={`/${locale}/${mod.slug}`} className="transition hover:text-neutral-950 dark:hover:text-white">
                  {dict.nav[mod.navKey]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="order-2 ml-auto sm:order-3">
          <LocaleSwitcher current={locale} label={dict.ui.language} />
        </div>
      </div>
    </header>
  );
}
