"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { createRemedial } from "@/app/actions/director";

type Student = { id: string; full_name: string };

export function RemedialCreator({ students }: { students: Student[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setQuery("");
    setStudentId("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!studentId) {
      setError("Sélectionnez un élève.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("student_id", studentId);
    startTransition(async () => {
      try {
        await createRemedial(fd);
        setSuccess("Rattrapage enregistré.");
        (e.target as HTMLFormElement).reset();
        setTimeout(close, 800);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  if (students.length === 0) {
    return (
      <div className="card px-4 py-6 text-center text-sm text-slate-500">
        Créez d&apos;abord un élève pour pouvoir programmer un rattrapage.
      </div>
    );
  }

  const filtered = query.trim()
    ? students.filter((s) =>
        s.full_name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : students;
  const selected = students.find((s) => s.id === studentId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full"
      >
        <Plus className="h-4 w-4" />
        Nouveau rattrapage
      </button>

      {open && (
        <>
          <div
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Nouveau rattrapage
                </h3>
                <p className="text-xs text-slate-500">
                  Notifie automatiquement l&apos;élève + ses parents.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="label">Élève</label>
                {selected ? (
                  <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2 text-sm">
                    <span className="font-medium text-indigo-900">
                      {selected.full_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudentId("")}
                      className="text-xs font-medium text-indigo-700"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="input pl-9"
                        placeholder="Rechercher un élève…"
                      />
                    </div>
                    <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                      {filtered.length === 0 ? (
                        <li className="px-3 py-4 text-center text-xs text-slate-400">
                          Aucun résultat.
                        </li>
                      ) : (
                        filtered.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setStudentId(s.id);
                                setQuery("");
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              {s.full_name}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input
                    name="session_date"
                    type="date"
                    required
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Durée</label>
                  <select
                    name="duration_minutes"
                    required
                    defaultValue="60"
                    className="input"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1h</option>
                    <option value="90">1h30</option>
                    <option value="120">2h</option>
                    <option value="180">3h</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Motif</label>
                <textarea
                  name="reason"
                  rows={3}
                  className="input resize-none"
                  placeholder="Chapitre 3 — fractions…"
                  maxLength={400}
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="btn-primary w-full"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
