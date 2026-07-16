import Link from "next/link";
import type { Locale } from "@/src/i18n/config";
import { portalDictionary } from "@/src/i18n/portal-dictionary";
import { MODULES } from "@/src/lib/modules";

/**
 * 无 3D 时的降级门户：六模块卡片网格。
 * 移动端 / 低配设备 / 不支持 WebGL 时替代星系，保证内容完整可达。
 */
export function ModuleGrid({ locale }: { locale: Locale }) {
  const dict = portalDictionary(locale);
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-28 sm:px-8">
      <p className="max-w-2xl text-balance text-lg text-white/70">{dict.tagline}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <Link
            key={mod.id}
            href={`/${locale}/${mod.slug}`}
            className="group flex flex-col rounded-2xl border border-white/12 bg-white/[0.04] p-5 transition hover:border-white/30 hover:bg-white/[0.07]"
          >
            <span
              aria-hidden
              className="mb-3 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: mod.planet.color }}
            />
            <h2 className="text-base font-semibold text-white">{dict.nav[mod.navKey]}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              {dict.modules[mod.id].blurb}
            </p>
            <span className="mt-3 text-sm text-white/50 transition group-hover:text-white">
              {dict.ui.enter} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
