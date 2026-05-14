"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { t as translate, type DictionaryKey, type Locale } from "./dictionary";

const STORAGE_KEY = "madrasati:locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: DictionaryKey) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<Ctx | null>(null);

/**
 * Wraps the app and provides a global `useTranslation` hook.
 *
 * The provider is mounted in the root layout. Locale is persisted in
 * localStorage and the document's `lang` + `dir` attributes are updated
 * whenever it changes — so Arabic flips the entire UI to RTL.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "fr" || saved === "ar") setLocaleState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Sync <html lang> + dir whenever locale changes.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", locale);
    root.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value: Ctx = {
    locale,
    setLocale,
    t: (k: DictionaryKey) => translate(locale, k),
    dir: locale === "ar" ? "rtl" : "ltr",
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Default to FR if used outside the provider (server components etc.).
    return {
      locale: "fr" as Locale,
      setLocale: () => {},
      t: (k: DictionaryKey) => translate("fr", k),
      dir: "ltr" as const,
    };
  }
  return ctx;
}
