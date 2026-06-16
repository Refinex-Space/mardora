export type DraftlyLocale = "zh-CN" | "en-US";

export type DraftlyI18nConfig = {
  locale?: DraftlyLocale;
};

export const defaultDraftlyLocale: DraftlyLocale = "zh-CN";

const supportedDraftlyLocales = new Set<DraftlyLocale>(["zh-CN", "en-US"]);

export function resolveDraftlyLocale(locale?: DraftlyLocale): DraftlyLocale {
  return locale && supportedDraftlyLocales.has(locale) ? locale : defaultDraftlyLocale;
}
