"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { setActiveAction } from "@/app/actions/admin-client";

export function ActiveToggle({
  schoolId,
  active,
}: {
  schoolId: string;
  active: boolean;
}) {
  // Coerce undefined / null to true so a partially-migrated row doesn't render
  // as "Désactivée" by accident.
  const initial = active === false ? false : true;
  const [value, setValue] = useState<boolean>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const previous = value;
    const next = !value;
    setValue(next); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        await setActiveAction(schoolId, next);
      } catch (err: any) {
        // Roll back the optimistic flip and surface the error inline — no
        // unhandled rejection bubbling up as "server-side exception".
        setValue(previous);
        setError(err?.message ?? "Erreur");
      }
    });
  }

  return (
    <div className="card space-y-2 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">État de l&apos;école</p>
          <p className="text-xs text-slate-500">
            {value ? "Active — accès autorisé" : "Désactivée — accès bloqué"}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={value}
          aria-label={value ? "Désactiver l'école" : "Activer l'école"}
          className={`relative h-7 w-12 rounded-full transition ${
            value ? "bg-emerald-500" : "bg-slate-300"
          } ${pending ? "opacity-60" : ""}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              value ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}
    </div>
  );
}
