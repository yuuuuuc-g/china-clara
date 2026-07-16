import type { Locale } from "@/src/i18n/config";
import type { Dictionary } from "@/src/i18n/get-dictionary";
import es from "@/src/i18n/dictionaries/es.json";
import en from "@/src/i18n/dictionaries/en.json";
import zh from "@/src/i18n/dictionaries/zh.json";

/**
 * 同步字典访问，供根路径 `/` 的客户端 3D 门户使用（无法 await 服务端 getDictionary）。
 * SSR 内容页仍用 get-dictionary.ts 的异步动态导入。
 */
const DICTIONARIES: Record<Locale, Dictionary> = {
  es: es as Dictionary,
  en: en as Dictionary,
  zh: zh as Dictionary,
};

export function portalDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
