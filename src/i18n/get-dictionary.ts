import type { Locale } from "@/src/i18n/config";

export interface Dictionary {
  nav: {
    understand: string;
    intel: string;
    suppliers: string;
    inquiries: string;
    community: string;
    api: string;
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
