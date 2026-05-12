"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Loader2, Trash2, X } from "lucide-react";
import { deleteClass } from "@/app/actions/director";

type Cls = { id: string; name: string; level: string | null };

export function ClassesList({
  classes,
  counts,
}: {
  classes: Cls[];
  counts: Record<string, number>;
}) {
  const [confirming, setConfirming] = useState<Cls | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticDeleted, setOptimisticDeleted] = useState<Set<string>>(new Set());

  function onConfirm() {
    if (!confirming) return;
    const id = confirming.id;
    setError(null);
    startTransition(async () => {
      try {
        await deleteClass(id);
        setOptimisticDeleted((prev) => new Set(prev).add(id));
        setConfirming(null);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  const visible = classes.filter((c) => !optimisticDeleted.has(c.id));

  return (
    <>
      {visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <GraduationCap className="h-6 w-6" />
          <p className="text-sm">Aucune classe pour le moment.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {visible.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {c.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {c.level ?? "—"} · {counts[c.id] ?? 0} élève(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(c)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 active:scale-[0.96]"
                aria-label={`Supprimer ${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirming && (
        <>
          <div
            onClick={() => !pending && setConfirming(null)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  Supprimer la classe
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  La classe <span className="font-semibold">{confirming.name}</span> sera supprimée.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setConfirming(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <li>• {counts[confirming.id] ?? 0} élève(s) seront détachés (non supprimés).</li>
              <li>• Les horaires, devoirs et examens de cette classe seront supprimés.</li>
              <li>• Action irréversible.</li>
            </ul>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={pending}
                className="btn-ghost"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="btn inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
