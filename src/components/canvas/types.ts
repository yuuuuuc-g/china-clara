import type { ModuleId } from "@/src/lib/modules";

export interface PlanetConfig {
  name: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  color: string;
  hasRing?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  /** 本地化的悬停标签。 */
  label?: string;
  /** 关联的 China Clara 模块（点击行星进入该模块页）。 */
  moduleId?: ModuleId;
  /** 目标 SSR 页 slug，供详情面板拼出 /[locale]/<slug>。 */
  slug?: string;
  textureUrl?: string;
  ringTextureUrl?: string;
  description?: string;
  eccentricity?: number;
}

export interface PlanetProps {
  config: PlanetConfig;
}
