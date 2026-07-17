import type { Locale } from "@/src/i18n/config";
import type { ModuleId, NavKey } from "@/src/lib/modules";

export interface Dictionary {
  nav: Record<NavKey, string>;
  /** 每个模块的一句话简介，用于门户详情面板、模块卡片与落地页。 */
  modules: Record<ModuleId, { blurb: string }>;
  ui: {
    /** 进入某模块的按钮文案。 */
    enter: string;
    /** 返回 3D 门户。 */
    backToPortal: string;
    /** 语言切换标签。 */
    language: string;
    /** 该模块尚在建设中。 */
    comingSoon: string;
  };
  content: {
    /** 读懂中国列表暂无文章时的空状态。 */
    articlesEmpty: string;
    /** 文章详情页返回列表。 */
    backToList: string;
    /** AI 初翻、尚未人工校订的提示（信任透明）。 */
    aiDraftNotice: string;
  };
  catalog: {
    suppliersEmpty: string;
    backToSuppliers: string;
    verified: string;
    products: string;
    noProducts: string;
    moq: string;
    priceOnRequest: string;
    website: string;
    location: string;
    founded: string;
    employees: string;
  };
  tagline: string;
}

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  es: () => import("@/src/i18n/dictionaries/es.json").then((m) => m.default as Dictionary),
  en: () => import("@/src/i18n/dictionaries/en.json").then((m) => m.default as Dictionary),
  zh: () => import("@/src/i18n/dictionaries/zh.json").then((m) => m.default as Dictionary),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
