export type MarkoraLocale = "zh-CN" | "en-US";

export type MarkoraI18nConfig = {
  locale?: MarkoraLocale;
};

export const defaultMarkoraLocale: MarkoraLocale = "zh-CN";

const supportedMarkoraLocales = new Set<MarkoraLocale>(["zh-CN", "en-US"]);

export function resolveMarkoraLocale(locale?: MarkoraLocale): MarkoraLocale {
  return locale && supportedMarkoraLocales.has(locale) ? locale : defaultMarkoraLocale;
}
