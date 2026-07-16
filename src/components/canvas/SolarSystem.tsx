"use client";

import { useMemo } from "react";
import { Planet } from "./Planet";
import type { PlanetConfig } from "./types";
import type { Locale } from "@/src/i18n/config";
import { MODULES } from "@/src/lib/modules";
import { portalDictionary } from "@/src/i18n/portal-dictionary";

/** 由六大模块注册表派生行星配置，悬停标签按当前语言本地化。 */
export function buildPlanets(locale: Locale): PlanetConfig[] {
  const dict = portalDictionary(locale);
  return MODULES.map((mod) => ({
    ...mod.planet,
    label: dict.nav[mod.navKey],
    moduleId: mod.id,
    slug: mod.slug,
    description: dict.modules[mod.id].blurb,
  }));
}

export function SolarSystem({ locale }: { locale: Locale }) {
  const planets = useMemo(() => buildPlanets(locale), [locale]);
  return (
    <group>
      {planets.map((planet) => (
        <Planet key={planet.name} config={planet} />
      ))}
    </group>
  );
}
