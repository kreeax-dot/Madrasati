"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Send, Users, User as UserIcon, X } from "lucide-react";
import { sendMessage } from "@/app/actions/director";

type Cls = { id: string; name: string };
type Student = { id: string; full_name: string; class_id: string | null };

export function MessageComposer({
  classes,
  students,
}: {
  classes: Cls[];
  students: Student[];
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"student" | "class">("student");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    fd.set("scope", scope);
    startTransition(async () => {
      try {
        await sendMessage(fd);
        setSuccess("Message envoyé.");
        (e.target as HTMLFormElement).reset();
        setTimeout(() => close(), 900);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
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
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
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
                  <select name="student_id" required className="input">
                    <option value="">— Sélectionner —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
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
