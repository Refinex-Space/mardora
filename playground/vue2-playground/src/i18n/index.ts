// Reactive i18n store for Vue 2. Uses Vue.observable for reactivity and
// installs $t/$locale/$setLocale on the Vue prototype.
import Vue from "vue";
import {
  DEFAULT_SHELL_LOCALE,
  type MessageKey,
  type ShellLocale,
  SHELL_LOCALE_STORAGE_KEY,
  SHELL_LOCALE_OPTIONS,
  translate,
} from "./locales";

interface I18nState {
  locale: ShellLocale;
}

const state = Vue.observable<I18nState>({ locale: DEFAULT_SHELL_LOCALE });

function readStoredLocale(): ShellLocale {
  try {
    const stored = localStorage.getItem(SHELL_LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return DEFAULT_SHELL_LOCALE;
}

export function initI18n(): void {
  state.locale = readStoredLocale();
}

export function setLocale(locale: ShellLocale): void {
  state.locale = locale;
  try {
    localStorage.setItem(SHELL_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

export function getLocale(): ShellLocale {
  return state.locale;
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(state.locale, key, vars);
}

export function installI18n(): void {
  Vue.prototype.$t = t;
  Vue.prototype.$i18nState = state;
  Vue.prototype.$setLocale = setLocale;
}

export { SHELL_LOCALE_OPTIONS, DEFAULT_SHELL_LOCALE, SHELL_LOCALE_STORAGE_KEY };
export type { ShellLocale, MessageKey };
