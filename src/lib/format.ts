import type { Locale } from "@/src/i18n/config";

const INTL_LOCALE: Record<Locale, string> = {
  es: "es-ES",
  en: "en-US",
  zh: "zh-CN",
};

/** 按站点语言格式化日期；无值返回空串。 */
export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
