"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { deleteSchoolAction } from "@/app/actions/admin-client";

export function DeleteSchoolButton({
  schoolId,
  schoolName,
  studentsCount,
  directorsCount,
}: {
  schoolId: string;
  schoolName: string;
  studentsCount: number;
  directorsCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  function onDelete() {
    if (typed.trim() !== schoolName) {
      setError("Le nom ne correspond pas.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteSchoolAction(schoolId);
        router.replace("/admin");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
          setTyped("");
          setError(null);
        }}
        className="btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        <Trash2 className="h-4 w-4" />
        Supprimer cette école
      </button>

      {confirming && (
        <>
          <div
            onClick={() => !pending && setConfirming(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Supprimer définitivement
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-semibold">{schoolName}</span> et toutes ses
                  données seront supprimées.
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <li>• {studentsCount} élève(s)</li>
              <li>• {directorsCount} directeur(s) (compte conservé, détaché)</li>
              <li>• Classes, horaires, devoirs, examens, rattrapages</li>
              <li>• Paiements, absences, messages, photos, menus</li>
              <li>• Action <strong>irréversible</strong></li>
            </ul>

            <div className="mt-4">
              <label className="label">
                Tapez <span className="font-mono">{schoolName}</span> pour confirmer
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="input"
                placeholder={schoolName}
                autoFocus
              />
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="btn-ghost"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending || typed.trim() !== schoolName}
                className="btn inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
