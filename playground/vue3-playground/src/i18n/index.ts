// Reactive i18n store + Vue 3 global mixin for the playground shell.
import { reactive, computed } from "vue";
import type { App } from "vue";
import {
  DEFAULT_SHELL_LOCALE,
  type MessageKey,
  type ShellLocale,
  SHELL_LOCALE_STORAGE_KEY,
  SHELL_LOCALE_OPTIONS,
  translate,
} from "./locales";

type State = { locale: ShellLocale };

const state = reactive<State>({ locale: DEFAULT_SHELL_LOCALE });

function readStoredLocale(): ShellLocale {
  try {
    const stored = localStorage.getItem(SHELL_LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return DEFAULT_SHELL_LOCALE;
}

let initialized = false;
export function initI18n(): void {
  if (initialized) return;
  initialized = true;
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

export const locale = computed<ShellLocale>(() => state.locale);

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(state.locale, key, vars);
}

// Global mixin: exposes $t, $locale, $setLocale on every component.
export function installI18n(app: App): void {
  app.config.globalProperties.$t = t;
  app.config.globalProperties.$locale = locale;
  app.config.globalProperties.$setLocale = setLocale;
}

export { SHELL_LOCALE_OPTIONS, DEFAULT_SHELL_LOCALE, SHELL_LOCALE_STORAGE_KEY };
export type { ShellLocale, MessageKey };
