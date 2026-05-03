"use client";

import { useState, useTransition } from "react";
import { setActiveAction } from "@/app/actions/admin-client";

export function ActiveToggle({
  schoolId,
  active,
}: {
  schoolId: string;
  active: boolean;
}) {
  const [value, setValue] = useState(active);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      await setActiveAction(schoolId, next);
    });
  }

  return (
    <div className="card flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-slate-800">État de l&apos;école</p>
        <p className="text-xs text-slate-500">
          {value ? "Active — accès autorisé" : "Désactivée"}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`relative h-7 w-12 rounded-full transition ${
          value ? "bg-emerald-500" : "bg-slate-200"
        } ${pending ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
