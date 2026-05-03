import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClass } from "@/app/actions/director";
import { requireRole } from "@/lib/auth";

export default async function NewClassPage() {
  await requireRole(["director"]);
  return (
    <div className="space-y-5">
      <Link
        href="/classes"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle classe</h1>
        <p className="mt-1 text-sm text-slate-600">
          Les horaires seront partagés par tous les élèves de la classe.
        </p>
      </div>

      <form action={createClass} className="space-y-4">
        <div>
          <label className="label">Nom</label>
          <input name="name" required className="input" placeholder="CE1 — A" />
        </div>
        <div>
          <label className="label">Niveau</label>
          <input name="level" className="input" placeholder="Primaire" />
        </div>
        <button type="submit" className="btn-primary w-full">
          Créer la classe
        </button>
      </form>
    </div>
  );
}
