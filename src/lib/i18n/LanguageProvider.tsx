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
const COOKIE_NAME = "madrasati_locale";

function setLocaleCookie(locale: Locale) {
  try {
    // 1 year, root path, lax SameSite so it travels with normal navigation.
    document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    /* ignore */
  }
}

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

  // Hydrate from localStorage once on mount, then mirror to cookie so
  // server components can also read it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "fr" || saved === "ar") {
        setLocaleState(saved);
        setLocaleCookie(saved);
      } else {
        setLocaleCookie("fr");
      }
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
    setLocaleCookie(l);
    // Force a soft refresh so server components re-render in the new
    // language without waiting for the next navigation.
    if (typeof window !== "undefined") {
      // Use setTimeout to let React state flush first.
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {
          /* ignore */
        }
      }, 50);
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
