"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createExam, deleteExam } from "@/app/actions/director";
import { formatDate } from "@/lib/utils";

type Cls = { id: string; name: string };
type Exam = {
  id: string;
  class_id: string;
  subject: string;
  exam_date: string;
  description: string | null;
  classes?: { name: string };
};

export function ExamEditor({
  classes,
  exams,
}: {
  classes: Cls[];
  exams: Exam[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticDeleted, setOptimisticDeleted] = useState<Set<string>>(new Set());

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createExam(fd);
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function onDelete(id: string) {
    setOptimisticDeleted((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await deleteExam(id);
    });
  }

  const visible = exams.filter((h) => !optimisticDeleted.has(h.id));

  if (classes.length === 0) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-slate-500">
        Créez d&apos;abord une classe.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        {open ? "Annuler" : "Programmer un examen"}
      </button>

      {open && (
        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          <div>
            <label className="label">Classe</label>
            <select name="class_id" required className="input">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Matière</label>
              <input name="subject" required className="input" placeholder="Math" />
            </div>
            <div>
              <label className="label">Date</label>
              <input name="exam_date" type="date" required className="input" />
            </div>
          </div>
          <div>
            <label className="label">À réviser</label>
            <textarea
              name="description"
              rows={3}
              className="input resize-none"
              placeholder="Chapitres 1 à 4, formules trigonométriques…"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Publier
          </button>
        </form>
      )}

      {visible.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          Aucun examen programmé.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((h) => (
            <li key={h.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-rose-600">
                    {h.subject} · {h.classes?.name ?? ""}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatDate(h.exam_date)}
                  </p>
                  {h.description && (
                    <p className="mt-1 text-sm text-slate-600">{h.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(h.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
