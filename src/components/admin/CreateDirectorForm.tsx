"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { createDirector } from "@/app/actions/admin";

export function CreateDirectorForm({ schoolId }: { schoolId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    formData.set("school_id", schoolId);
    startTransition(async () => {
      try {
        await createDirector(formData);
        setSuccess("Compte directeur créé.");
        formRef.current?.reset();
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-3 p-4">
      <div>
        <label className="label">Nom complet</label>
        <input name="full_name" className="input" placeholder="Mme. Benali" />
      </div>
      <div>
        <label className="label">Email</label>
        <input
          name="email"
          type="email"
          required
          className="input"
          placeholder="director@ecole.dz"
        />
      </div>
      <div>
        <label className="label">Mot de passe</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="input"
          placeholder="min. 6 caractères"
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

      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Créer le directeur
      </button>
    </form>
  );
}
