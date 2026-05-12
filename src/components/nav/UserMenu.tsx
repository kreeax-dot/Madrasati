"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super admin",
  director: "Directeur",
  parent: "Parent",
  student: "Élève",
};

export function UserMenu({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: UserRole;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
                  {roleLabels[role]}
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
            <div className="p-2">
              <LogoutButton variant="menu" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
