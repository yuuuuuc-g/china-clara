"use client";

import { useMemo } from "react";
import { Planet } from "./Planet";
import { EarthMoonSystem } from "./EarthMoonSystem";
import type { PlanetConfig } from "./types";
import type { Locale } from "@/src/i18n/config";
import { MODULES } from "@/src/lib/modules";
import { portalDictionary } from "@/src/i18n/portal-dictionary";

/**
 * 完整太阳系：八大行星 + 月球。
 * 六颗行星承载模块（可点击进入），水星、土星（含环）与月球为装饰天体。
 * 模块行星由 MODULES 注册表派生；装饰行星只有视觉配置。
 */
const DECOR_PLANETS: PlanetConfig[] = [
  {
    name: "Mercury",
    size: 0.4,
    orbitRadius: 4,
    orbitSpeed: 0.8,
    rotationSpeed: 0.5,
    color: "#a0a0a0",
    textureUrl: "/textures/2k_mercury.jpg",
  },
  {
    name: "Saturn",
    size: 1.5,
    orbitRadius: 18,
    orbitSpeed: 0.15,
    rotationSpeed: 1.8,
    color: "#e3dccb",
    hasRing: true,
    ringInnerRadius: 1.3,
    ringOuterRadius: 2.0,
    textureUrl: "/textures/2k_saturn.jpg",
    ringTextureUrl: "/textures/2k_saturn_ring_alpha.png",
  },
];

/** 模块行星 + 装饰行星合并为完整太阳系，悬停标签按当前语言本地化。 */
export function buildPlanets(locale: Locale): PlanetConfig[] {
  const dict = portalDictionary(locale);
  const modulePlanets = MODULES.map((mod) => ({
    ...mod.planet,
    label: dict.nav[mod.navKey],
    moduleId: mod.id,
    slug: mod.slug,
    description: dict.modules[mod.id].blurb,
  }));
  return [...modulePlanets, ...DECOR_PLANETS].sort((a, b) => a.orbitRadius - b.orbitRadius);
}

export function SolarSystem({ locale }: { locale: Locale }) {
  const planets = useMemo(() => buildPlanets(locale), [locale]);
  return (
    <group>
      {planets.map((planet) => {
        // 地球带月球，单独用地月系统渲染
        if (planet.name === "Earth") {
          return <EarthMoonSystem key={planet.name} config={planet} />;
        }
        return <Planet key={planet.name} config={planet} />;
      })}
    </group>
  );
}
