"use client";

import Link from "next/link";
import type { Locale } from "@/src/i18n/config";
import { portalDictionary } from "@/src/i18n/portal-dictionary";
import { useSolarStore } from "@/src/store/solarStore";

/** 聚焦某行星时的详情浮层：本地化标题 + 简介 + 进入模块页链接。 */
export function ModuleDetailPanel({ locale }: { locale: Locale }) {
  const focusedPlanet = useSolarStore((state) => state.focusedPlanet);
  const setFocusedPlanet = useSolarStore((state) => state.setFocusedPlanet);
  const dict = portalDictionary(locale);

  if (!focusedPlanet || !focusedPlanet.slug) return null;

  return (
    <aside className="pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/70 p-6 text-white shadow-2xl backdrop-blur-md sm:bottom-10">
      <button
        type="button"
        onClick={() => setFocusedPlanet(null)}
        aria-label={dict.ui.backToPortal}
        className="absolute right-4 top-4 text-white/50 transition hover:text-white"
      >
        ✕
      </button>
      <h2 className="text-xl font-semibold tracking-tight">{focusedPlanet.label}</h2>
      {focusedPlanet.description && (
        <p className="mt-2 text-sm leading-relaxed text-white/70">{focusedPlanet.description}</p>
      )}
      <Link
        href={`/${locale}/${focusedPlanet.slug}`}
        className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/85"
      >
        {dict.ui.enter} →
      </Link>
    </aside>
  );
}
