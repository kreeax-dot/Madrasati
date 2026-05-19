"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createHomework, deleteHomework } from "@/app/actions/director";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type Cls = { id: string; name: string };
type Hw = {
  id: string;
  class_id: string;
  subject: string;
  title: string;
  description: string | null;
  due_date: string;
  classes?: { name: string };
};

export function HomeworkEditor({
  classes,
  homework,
}: {
  classes: Cls[];
  homework: Hw[];
}) {
  const { t } = useTranslation();
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
        await createHomework(fd);
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
      await deleteHomework(id);
    });
  }

  const visible = homework.filter((h) => !optimisticDeleted.has(h.id));

  if (classes.length === 0) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-slate-500">
        {t("homework.classFirst")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        {open ? t("common.cancel") : t("homework.giveCta")}
      </button>

      {open && (
        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          <div>
            <label className="label">{t("student.class")}</label>
            <select name="class_id" required className="input">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("homework.fieldSubject")}</label>
              <input name="subject" required className="input" placeholder="Math" />
            </div>
            <div>
              <label className="label">{t("homework.fieldDueDate")}</label>
              <input name="due_date" type="date" required className="input" />
            </div>
          </div>
          <div>
            <label className="label">{t("homework.fieldTitle")}</label>
            <input name="title" required className="input" />
          </div>
          <div>
            <label className="label">{t("homework.fieldDescription")}</label>
            <textarea
              name="description"
              rows={3}
              className="input resize-none"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("homework.publish")}
          </button>
        </form>
      )}

      {visible.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          {t("homework.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((h) => (
            <li key={h.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                    {h.subject} · {h.classes?.name ?? ""}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{h.title}</p>
                  {h.description && (
                    <p className="mt-1 text-sm text-slate-600">{h.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {t("homework.dueOn")} {formatDate(h.due_date)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(h.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600"
                  aria-label={t("common.delete")}
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
