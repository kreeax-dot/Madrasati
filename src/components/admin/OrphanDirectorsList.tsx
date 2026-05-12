"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Mail, Trash2, UserCog } from "lucide-react";
import {
  deleteOrphanDirectorAction,
  reassignDirectorAction,
} from "@/app/actions/admin-client";

type Director = { id: string; email: string; full_name: string };
type Cls = { id: string; name: string };

export function OrphanDirectorsList({
  directors,
  schools,
}: {
  directors: Director[];
  schools: Cls[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticallyHandled, setOptimisticallyHandled] = useState<Set<string>>(
    new Set(),
  );
  const [confirmDelete, setConfirmDelete] = useState<Director | null>(null);

  function reassign(profileId: string, schoolId: string) {
    if (!schoolId) return;
    setError(null);
    setOptimisticallyHandled((s) => new Set(s).add(profileId));
    startTransition(async () => {
      try {
        await reassignDirectorAction(profileId, schoolId);
      } catch (err: any) {
        setOptimisticallyHandled((s) => {
          const n = new Set(s);
          n.delete(profileId);
          return n;
        });
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function remove() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setError(null);
    setOptimisticallyHandled((s) => new Set(s).add(id));
    setConfirmDelete(null);
    startTransition(async () => {
      try {
        await deleteOrphanDirectorAction(id);
      } catch (err: any) {
        setOptimisticallyHandled((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        setError(err?.message ?? "Erreur");
      }
    });
  }

  const visible = directors.filter((d) => !optimisticallyHandled.has(d.id));
  if (visible.length === 0 && !error) return null;

  return (
    <>
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <ul className="card divide-y divide-slate-100">
        {visible.map((d) => (
          <li key={d.id} className="space-y-2 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <UserCog className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {d.full_name || d.email}
                </p>
                <p className="truncate text-xs text-slate-500 inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {d.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(d)}
                disabled={pending}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {schools.length > 0 ? (
              <div className="flex items-center gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => reassign(d.id, e.target.value)}
                  disabled={pending}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="" disabled>
                    Réassigner à une école…
                  </option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {pending && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Créez une école avant de pouvoir réassigner.
              </p>
            )}
          </li>
        ))}
      </ul>

      {confirmDelete && (
        <>
          <div
            onClick={() => !pending && setConfirmDelete(null)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <h3 className="text-base font-semibold text-slate-900">
              Supprimer ce directeur ?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium">
                {confirmDelete.full_name || confirmDelete.email}
              </span>{" "}
              sera définitivement supprimé (compte + profil). Action irréversible.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={pending}
                className="btn-ghost"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={remove}
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
