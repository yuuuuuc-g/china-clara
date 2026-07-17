/**
 * China Clara 六大模块的唯一真源（single source of truth）。
 * 3D 星系门户与 SSR 内容页都从这里派生，避免行星与导航脱节。
 * 铁律 #4：任何模块在无 3D 时都必须能通过普通链接抵达。
 */

export type ModuleId =
  | "understand"
  | "intelligence"
  | "suppliers"
  | "inquiries"
  | "community"
  | "developers";

/** 字典 nav 键（与旧 knowledge-galaxy 迁移沿用的键名保持一致）。 */
export type NavKey =
  | "understand"
  | "intel"
  | "suppliers"
  | "inquiries"
  | "community"
  | "api";

/** 行星视觉参数（映射到 canvas/PlanetConfig，但不依赖 three 类型）。 */
export interface PlanetVisual {
  /** three.js 场景中的唯一对象名（相机聚焦按名查找）。 */
  name: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  color: string;
  textureUrl: string;
  hasRing?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringTextureUrl?: string;
}

export interface ModuleDef {
  id: ModuleId;
  /** URL slug：/[locale]/<slug>。面向 SEO，需语义化且稳定。 */
  slug: string;
  /** 字典 nav 键，供本地化标签复用。 */
  navKey: NavKey;
  planet: PlanetVisual;
}

export const MODULES: readonly ModuleDef[] = [
  // 数组顺序 = 产品优先级（导航/网格渲染顺序），内容先行：读懂中国第一。
  // 行星视觉按真实太阳系排布（SolarSystem 按 orbitRadius 排序渲染，与此处顺序无关）。
  // 模块 → 行星映射：金星=询盘、地球=读懂中国、火星=情报、木星=供应商、
  // 天王星=社区、海王星=开放接口；水星、土星、月球为无模块装饰天体（见 SolarSystem）。
  {
    id: "understand",
    slug: "understand",
    navKey: "understand",
    planet: {
      name: "Earth",
      size: 0.75,
      orbitRadius: 8,
      orbitSpeed: 0.5,
      rotationSpeed: 1.0,
      color: "#4f86f7",
      textureUrl: "/textures/2k_earth_daymap.jpg",
    },
  },
  {
    id: "intelligence",
    slug: "intelligence",
    navKey: "intel",
    planet: {
      name: "Mars",
      size: 0.5,
      orbitRadius: 10,
      orbitSpeed: 0.4,
      rotationSpeed: 0.9,
      color: "#c1440e",
      textureUrl: "/textures/2k_mars.jpg",
    },
  },
  {
    id: "suppliers",
    slug: "suppliers",
    navKey: "suppliers",
    planet: {
      name: "Jupiter",
      size: 1.8,
      orbitRadius: 14,
      orbitSpeed: 0.2,
      rotationSpeed: 2.0,
      color: "#d4a373",
      textureUrl: "/textures/2k_jupiter.jpg",
    },
  },
  {
    id: "inquiries",
    slug: "inquiries",
    navKey: "inquiries",
    planet: {
      name: "Venus",
      size: 0.7,
      orbitRadius: 6,
      orbitSpeed: 0.6,
      rotationSpeed: 0.3,
      color: "#e6c288",
      textureUrl: "/textures/2k_venus_atmosphere.jpg",
    },
  },
  {
    id: "community",
    slug: "community",
    navKey: "community",
    planet: {
      name: "Uranus",
      size: 1.0,
      orbitRadius: 22,
      orbitSpeed: 0.1,
      rotationSpeed: 1.2,
      color: "#a7d6d6",
      textureUrl: "/textures/2k_uranus.jpg",
    },
  },
  {
    id: "developers",
    slug: "developers",
    navKey: "api",
    planet: {
      name: "Neptune",
      size: 0.95,
      orbitRadius: 26,
      orbitSpeed: 0.08,
      rotationSpeed: 1.1,
      color: "#4b70dd",
      textureUrl: "/textures/2k_neptune.jpg",
    },
  },
] as const;

export function getModule(id: ModuleId): ModuleDef {
  const found = MODULES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown module: ${id}`);
  return found;
}
