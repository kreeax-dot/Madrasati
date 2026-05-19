"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, PowerOff, Trash2 } from "lucide-react";
import { deleteStudent, setStudentEnabled } from "@/app/actions/director";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Director-only "Zone de danger" placed at the bottom of the student
 * detail page. Two actions:
 *   - Toggle disable / re-enable (preserves data, blocks login via
 *     Supabase Admin API ban).
 *   - Permanent delete (with type-the-name confirmation).
 */
export function StudentDangerZone({
  studentId,
  studentName,
  isActive,
}: {
  studentId: string;
  studentName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [active, setActive] = useState(isActive);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function toggleEnable() {
    setError(null);
    setInfo(null);
    const next = !active;
    setActive(next); // optimistic
    startTransition(async () => {
      const res = await setStudentEnabled(studentId, next);
      if (!res.ok) {
        setActive(!next);
        setError(res.error);
      } else {
        setInfo(next ? t("student.enabledOk") : t("student.disabledOk"));
      }
    });
  }

  function onDelete() {
    if (typed.trim() !== studentName) {
      setError("Le nom ne correspond pas.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteStudent(studentId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/students");
      router.refresh();
    });
  }

  return (
    <section className="pt-2">
      <h2 className="mb-3 text-sm font-semibold text-red-700">
        {t("student.dangerZone")}
      </h2>

      <div className="card flex items-start gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <PowerOff className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">
            {active ? t("student.disable") : t("student.disabled")}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("student.disabledHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleEnable}
          disabled={pending}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            active ? "bg-emerald-500" : "bg-slate-300"
          } ${pending ? "opacity-60" : ""}`}
          aria-pressed={active}
          aria-label={active ? t("student.disable") : t("student.enable")}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              active ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setConfirming(true);
          setTyped("");
          setError(null);
        }}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 active:scale-[0.97]"
      >
        <Trash2 className="h-4 w-4" />
        {t("student.deletePerm")}
      </button>

      {info && !error && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {info}
        </div>
      )}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
                  {t("student.deleteConfirmTitle")}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t("student.deleteConfirmBody")}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="label">
                Tapez{" "}
                <span className="font-mono font-semibold">{studentName}</span>{" "}
                pour confirmer
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="input"
                placeholder={studentName}
                autoFocus
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="btn-ghost"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending || typed.trim() !== studentName}
                className="btn inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.delete")}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
