"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { initials } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { UserRole } from "@/types/database";

export function UserMenu({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: UserRole;
}) {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const roleLabel =
    role === "super_admin"
      ? t("role.super_admin")
      : role === "director"
        ? t("role.director")
        : role === "parent"
          ? t("role.parent")
          : t("role.student");

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:scale-[0.96]"
        aria-label="Profil"
      >
        {initials(fullName)}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm md:hidden"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white shadow-card safe-bottom md:absolute md:inset-x-auto md:right-0 md:bottom-auto md:mt-2 md:w-72 md:rounded-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                {initials(fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {fullName}
                </p>
                <p className="truncate text-xs text-slate-500">{email}</p>
                <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                  {roleLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 md:hidden"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-slate-100 p-3">
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Globe className="h-3 w-3" />
                {t("lang.label")}
              </p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setLocale("fr")}
                  className={`rounded-lg py-1.5 text-sm font-medium transition ${
                    locale === "fr"
                      ? "bg-white text-slate-900 shadow-soft"
                      : "text-slate-500"
                  }`}
                >
                  {t("lang.french")}
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("ar")}
                  className={`rounded-lg py-1.5 text-sm font-medium transition ${
                    locale === "ar"
                      ? "bg-white text-slate-900 shadow-soft"
                      : "text-slate-500"
                  }`}
                >
                  {t("lang.arabic")}
                </button>
              </div>
            </div>
            <div className="p-2">
              <LogoutButton variant="menu" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
