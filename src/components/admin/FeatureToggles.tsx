"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof SchoolFeatures) {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    startTransition(async () => {
      await saveFeaturesAction(schoolId, next);
    });
  }

  return (
    <ul className="card divide-y divide-slate-100">
      {(Object.keys(labels) as (keyof SchoolFeatures)[]).map((key) => (
        <li key={key} className="flex items-center justify-between p-4">
          <span className="text-sm font-medium text-slate-800">{labels[key]}</span>
          <button
            type="button"
            onClick={() => toggle(key)}
            disabled={pending}
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
  );
}
