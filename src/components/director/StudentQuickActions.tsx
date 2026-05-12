"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Repeat,
  Wallet,
} from "lucide-react";
import {
  createAbsence,
  createPayment,
  createRemedial,
  regenerateStudentCode,
} from "@/app/actions/director";

type Sheet = null | "payment" | "absence" | "code" | "remedial";

export function StudentQuickActions({
  studentId,
  currentCode,
}: {
  studentId: string;
  currentCode: string | null;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(currentCode);
  const [copied, setCopied] = useState(false);

  function close() {
    setSheet(null);
    setError(null);
  }

  function onSubmitPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("student_id", studentId);
    startTransition(async () => {
      try {
        await createPayment(fd);
        close();
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function onSubmitAbsence(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("student_id", studentId);
    startTransition(async () => {
      try {
        await createAbsence(fd);
        close();
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function onSubmitRemedial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("student_id", studentId);
    startTransition(async () => {
      try {
        await createRemedial(fd);
        close();
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function regenerate() {
    startTransition(async () => {
      try {
        const newCode = await regenerateStudentCode(studentId);
        setCode(newCode);
        setSheet("code");
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function copy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        <Action onClick={() => setSheet("payment")} icon={<Wallet className="h-4 w-4" />} label="Paiement" />
        <Action onClick={() => setSheet("absence")} icon={<ClipboardList className="h-4 w-4" />} label="Absence" />
        <Action onClick={() => setSheet("remedial")} icon={<Repeat className="h-4 w-4" />} label="Rattrapage" />
        <Action onClick={() => setSheet("code")} icon={<KeyRound className="h-4 w-4" />} label="Code" />
      </div>

      {sheet && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        />
      )}

      {sheet && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
          {sheet === "payment" && (
            <form onSubmit={onSubmitPayment} className="space-y-3">
              <h3 className="text-base font-semibold">Nouveau paiement</h3>
              <div>
                <label className="label">Description</label>
                <input name="description" required className="input" placeholder="Frais mensuels" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Montant (DZD)</label>
                  <input name="amount" type="number" required className="input" placeholder="12000" />
                </div>
                <div>
                  <label className="label">Échéance</label>
                  <input name="due_date" type="date" required className="input" />
                </div>
              </div>
              {error && <Err>{error}</Err>}
              <button type="submit" disabled={pending} className="btn-primary w-full">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </form>
          )}
          {sheet === "absence" && (
            <form onSubmit={onSubmitAbsence} className="space-y-3">
              <h3 className="text-base font-semibold">Nouvelle absence</h3>
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
              {error && <Err>{error}</Err>}
              <button type="submit" disabled={pending} className="btn-primary w-full">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </form>
          )}
          {sheet === "remedial" && (
            <form onSubmit={onSubmitRemedial} className="space-y-3">
              <h3 className="text-base font-semibold">Nouveau rattrapage</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input name="session_date" type="date" required className="input" />
                </div>
                <div>
                  <label className="label">Durée</label>
                  <select name="duration_minutes" required className="input">
                    <option value="60">1h</option>
                    <option value="90">1h30</option>
                    <option value="120">2h</option>
                    <option value="180">3h</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Motif</label>
                <textarea
                  name="reason"
                  rows={3}
                  className="input resize-none"
                  placeholder="Chapitre 3 — fractions"
                />
              </div>
              {error && <Err>{error}</Err>}
              <button type="submit" disabled={pending} className="btn-primary w-full">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </form>
          )}
          {sheet === "code" && (
            <div className="space-y-3 text-center">
              <h3 className="text-base font-semibold">Code de connexion</h3>
              {code ? (
                <>
                  <div className="rounded-2xl bg-slate-900 px-4 py-5 text-2xl font-bold tracking-[0.4em] text-white font-mono">
                    {code}
                  </div>
                  <button
                    type="button"
                    onClick={copy}
                    className="btn-ghost w-full"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copié !" : "Copier"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Aucun code actif. Régénérez-en un.
                </p>
              )}
              <button
                type="button"
                onClick={regenerate}
                disabled={pending}
                className="btn-primary w-full"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {code ? "Régénérer le code" : "Générer un code"}
              </button>
              <p className="text-xs text-slate-400">
                Régénérer invalide le code précédent.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex flex-col items-center justify-center gap-1 py-3 active:scale-[0.98]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </button>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</div>
  );
}
