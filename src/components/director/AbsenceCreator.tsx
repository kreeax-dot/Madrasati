"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createAbsence } from "@/app/actions/director";

export function AbsenceCreator({
  students,
}: {
  students: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createAbsence(fd);
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        {open ? "Annuler" : "Enregistrer une absence"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          <div>
            <label className="label">Élève</label>
            <select name="student_id" required className="input">
              <option value="">— Sélectionner —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input name="date" type="date" required className="input" />
          </div>
          <div>
            <label className="label">Motif</label>
            <input name="reason" className="input" placeholder="Maladie" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="justified" className="h-4 w-4" />
            Absence justifiée
          </label>
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </form>
      )}
    </div>
  );
}
