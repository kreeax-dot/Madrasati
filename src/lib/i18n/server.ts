import { cookies } from "next/headers";
import { type Locale, t as translate, type DictionaryKey } from "./dictionary";

export const LOCALE_COOKIE = "madrasati_locale";

/**
 * Reads the user's locale from a cookie set by the client-side
 * LanguageProvider. Defaults to "fr". This is the only safe way for
 * server components (which can't access localStorage) to know which
 * language the user picked.
 */
export function getServerLocale(): Locale {
  try {
    const v = cookies().get(LOCALE_COOKIE)?.value;
    return v === "ar" ? "ar" : "fr";
  } catch {
    return "fr";
  }
}

/** Server-side translation helper. */
export function st(key: DictionaryKey): string {
  return translate(getServerLocale(), key);
}

export function serverDir(): "ltr" | "rtl" {
  return getServerLocale() === "ar" ? "rtl" : "ltr";
}
