export type MardoraLocale = "zh-CN" | "en-US";

export type MardoraI18nConfig = {
  locale?: MardoraLocale;
};

export const defaultMardoraLocale: MardoraLocale = "zh-CN";

const supportedMardoraLocales = new Set<MardoraLocale>(["zh-CN", "en-US"]);

export function resolveMardoraLocale(locale?: MardoraLocale): MardoraLocale {
  return locale && supportedMardoraLocales.has(locale) ? locale : defaultMardoraLocale;
}
