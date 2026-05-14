"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Check, Copy, Loader2, UserPlus } from "lucide-react";
import { createStudent } from "@/app/actions/director";
import { AvatarPicker } from "./AvatarPicker";

type DebugError = {
  message: string;
  step: string;
  details?: Record<string, unknown>;
};

export function NewStudentForm({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<DebugError | null>(null);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await createStudent(fd);
        if (res.ok) {
          setResult({ code: res.code });
          (e.target as HTMLFormElement).reset();
        } else {
          // Server action returned structured error — surface fully.
          setError({
            message: res.error,
            step: res.step,
            details: res.details,
          });
        }
      } catch (err: any) {
        // Caught client-side throw (network etc.) — also surface fully.
        setError({
          message: err?.message ?? "Erreur inconnue",
          step: "client_catch",
          details: { stack: err?.stack },
        });
      }
    });
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (result) {
    return (
      <div className="space-y-5">
        <div className="card p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            Élève créé
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Donnez ce code à l&apos;élève pour qu&apos;il crée son compte :
          </p>
          <div className="mt-4 rounded-2xl bg-slate-900 px-6 py-5 text-3xl font-bold tracking-[0.4em] text-white font-mono">
            {result.code}
          </div>
          <button
            type="button"
            onClick={copy}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier le code"}
          </button>
          <p className="mt-3 text-xs text-slate-400">
            Code à usage unique. À utiliser sur la page de connexion → onglet « Code élève ».
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="btn-ghost"
          >
            Ajouter un autre
          </button>
          <button
            type="button"
            onClick={() => router.push("/students")}
            className="btn-primary"
          >
            Voir la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="card p-4">
        <p className="label">Photo de profil</p>
        <AvatarPicker name="avatar" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Prénom</label>
          <input name="first_name" required className="input" placeholder="Amina" />
        </div>
        <div>
          <label className="label">Nom</label>
          <input name="last_name" required className="input" placeholder="Benali" />
        </div>
      </div>
      <div>
        <label className="label">Date de naissance</label>
        <input name="date_of_birth" type="date" className="input" />
      </div>
      <div>
        <label className="label">Classe</label>
        <select name="class_id" className="input">
          <option value="">— Aucune classe —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <ErrorPanel error={error} />}

      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Créer l&apos;élève + générer le code
      </button>
    </form>
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
      <details className="text-xs">
        <summary className="cursor-pointer font-medium text-red-700">
          Détails techniques (étape : {error.step})
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-white/60 p-2 font-mono text-[10px] leading-tight text-red-900">
          {JSON.stringify(error.details ?? {}, null, 2)}
        </pre>
      </details>
    </div>
  );
}
