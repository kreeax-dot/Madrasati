"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Compact FR / AR toggle sitting directly in the header next to the
 * notification bell. Always visible — no menu open needed.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const next = locale === "fr" ? "ar" : "fr";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-[11px] font-bold uppercase text-slate-700 active:scale-[0.96]"
      aria-label={locale === "fr" ? "Passer en arabe" : "Passer en français"}
      title={locale === "fr" ? "العربية" : "Français"}
    >
      {locale === "fr" ? "AR" : "FR"}
    </button>
  );
}
