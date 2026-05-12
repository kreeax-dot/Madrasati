"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { SchoolFeatures } from "@/types/database";
import { saveFeaturesAction } from "@/app/actions/admin-client";

const labels: Record<keyof SchoolFeatures, string> = {
  payments: "Paiements",
  messages: "Messages",
  absences: "Absences",
  schedule: "Emploi du temps",
};

export function FeatureToggles({
  schoolId,
  initial,
}: {
  schoolId: string;
  initial: SchoolFeatures;
}) {
  const [features, setFeatures] = useState<SchoolFeatures>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof SchoolFeatures) {
    const previous = features;
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    setError(null);
    startTransition(async () => {
      try {
        await saveFeaturesAction(schoolId, next);
      } catch (err: any) {
        setFeatures(previous);
        setError(err?.message ?? "Erreur");
      }
    });
  }

  return (
    <div className="space-y-2">
      <ul className="card divide-y divide-slate-100">
        {(Object.keys(labels) as (keyof SchoolFeatures)[]).map((key) => (
          <li key={key} className="flex items-center justify-between p-4">
            <span className="text-sm font-medium text-slate-800">{labels[key]}</span>
            <button
              type="button"
              onClick={() => toggle(key)}
              disabled={pending}
              aria-pressed={!!features[key]}
              className={`relative h-7 w-12 rounded-full transition ${
                features[key] ? "bg-brand-600" : "bg-slate-200"
              } ${pending ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                  features[key] ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </li>
        ))}
        {pending && (
          <li className="flex items-center justify-center gap-2 p-3 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…
          </li>
        )}
      </ul>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}
    </div>
  );
}
