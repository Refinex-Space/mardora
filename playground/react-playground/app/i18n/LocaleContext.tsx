"use client";

import * as React from "react";
import {
  DEFAULT_SHELL_LOCALE,
  type MessageKey,
  type ShellLocale,
  SHELL_LOCALE_STORAGE_KEY,
  SHELL_LOCALE_OPTIONS,
  translate,
} from "./locales";

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

type LocaleContextValue = {
  locale: ShellLocale;
  setLocale: (locale: ShellLocale) => void;
  t: TranslateFn;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

function readStoredLocale(): ShellLocale {
  if (typeof window === "undefined") return DEFAULT_SHELL_LOCALE;
  try {
    const stored = window.localStorage.getItem(SHELL_LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  return DEFAULT_SHELL_LOCALE;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<ShellLocale>(DEFAULT_SHELL_LOCALE);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  React.useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = React.useCallback((next: ShellLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(SHELL_LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = React.useCallback<TranslateFn>(
    (key, vars) => translate(locale, key, vars),
    [locale]
  );

  const value = React.useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}

export { SHELL_LOCALE_OPTIONS };
export type { ShellLocale, MessageKey };
