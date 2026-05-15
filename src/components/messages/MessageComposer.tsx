"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
  Search,
  Send,
  Users,
  User as UserIcon,
  X,
} from "lucide-react";
import { sendMessage } from "@/app/actions/director";

type Cls = { id: string; name: string };
type Student = { id: string; full_name: string; class_id: string | null };

type DebugError = {
  message: string;
  step: string;
  details?: Record<string, unknown>;
};

export function MessageComposer({
  classes,
  students,
}: {
  classes: Cls[];
  students: Student[];
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"student" | "class">("student");
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<DebugError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.full_name.toLowerCase().includes(q));
  }, [students, studentQuery]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setStudentQuery("");
    setSelectedStudentId("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    fd.set("scope", scope);
    if (scope === "student") {
      if (!selectedStudentId) {
        setError({ message: "Sélectionnez un élève.", step: "client_validate" });
        return;
      }
      fd.set("student_id", selectedStudentId);
    }
    startTransition(async () => {
      try {
        const res = await sendMessage(fd);
        if (res.ok) {
          setSuccess(
            res.recipientCount === 1
              ? "Message envoyé."
              : `Message envoyé à ${res.recipientCount} destinataires.`,
          );
          (e.target as HTMLFormElement).reset();
          setSelectedStudentId("");
          setStudentQuery("");
          setTimeout(() => close(), 1000);
        } else {
          setError({
            message: res.error,
            step: res.step,
            details: res.details,
          });
        }
      } catch (err: any) {
        setError({
          message: err?.message ?? "Erreur inconnue",
          step: "client_catch",
          details: { stack: err?.stack },
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full"
      >
        <Plus className="h-4 w-4" />
        Nouveau message
      </button>

      {open && (
        <>
          <div
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Nouveau message
                </h3>
                <p className="text-xs text-slate-500">
                  Envoyé à l&apos;élève, ses parents, ou toute une classe.
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

            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setScope("student")}
                className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  scope === "student"
                    ? "bg-white text-slate-900 shadow-soft"
                    : "text-slate-500"
                }`}
              >
                <UserIcon className="h-4 w-4" />
                Élève
              </button>
              <button
                type="button"
                onClick={() => setScope("class")}
                className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  scope === "class"
                    ? "bg-white text-slate-900 shadow-soft"
                    : "text-slate-500"
                }`}
              >
                <Users className="h-4 w-4" />
                Classe
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              {scope === "student" ? (
                <div>
                  <label className="label">Élève</label>
                  {selectedStudent ? (
                    <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 text-sm">
                      <span className="truncate font-medium text-brand-900">
                        {selectedStudent.full_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId("")}
                        className="ml-2 shrink-0 text-xs font-medium text-brand-700"
                      >
                        Changer
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={studentQuery}
                          onChange={(e) => setStudentQuery(e.target.value)}
                          className="input pl-9"
                          placeholder="Rechercher un élève par nom…"
                        />
                      </div>
                      {students.length === 0 ? (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Aucun élève dans votre école. Créez-en un d&apos;abord
                          dans la section Élèves.
                        </p>
                      ) : (
                        <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                          {filteredStudents.length === 0 ? (
                            <li className="px-3 py-4 text-center text-xs text-slate-400">
                              Aucun résultat.
                            </li>
                          ) : (
                            filteredStudents.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStudentId(s.id);
                                    setStudentQuery("");
                                  }}
                                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  {s.full_name}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label">Classe</label>
                  <select name="class_id" required className="input">
                    <option value="">— Sélectionner —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Sujet</label>
                <input
                  name="subject"
                  required
                  className="input"
                  placeholder="Réunion parents-professeurs"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="label">Message</label>
                <textarea
                  name="body"
                  required
                  rows={5}
                  className="input resize-none"
                  placeholder="Bonjour,…"
                  maxLength={2000}
                />
              </div>

              {error && <ErrorPanel error={error} />}
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
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}

function ErrorPanel({ error }: { error: DebugError }) {
  return (
    <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Erreur</p>
          <p className="mt-0.5 break-words font-mono text-xs">{error.message}</p>
        </div>
      </div>
      {error.details && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-red-700">
            Détails techniques (étape : {error.step})
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-white/60 p-2 font-mono text-[10px] leading-tight text-red-900">
            {JSON.stringify(error.details ?? {}, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
