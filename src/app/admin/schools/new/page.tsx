import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSchool } from "@/app/actions/admin";
import { requireRole } from "@/lib/auth";

export default async function NewSchoolPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-5">
      <Link
        href="/admin"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle école</h1>
        <p className="mt-1 text-sm text-slate-600">
          Créez une école et son directeur ensuite.
        </p>
      </div>

      <form action={createSchool} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Nom de l&apos;école</label>
          <input id="name" name="name" required className="input" placeholder="École Démo Alger" />
        </div>
        <div>
          <label htmlFor="address" className="label">Adresse</label>
          <input id="address" name="address" className="input" placeholder="12 rue de la Liberté, Alger" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Téléphone</label>
          <input id="phone" name="phone" className="input" placeholder="+213 555 000 000" />
        </div>
        <button type="submit" className="btn-primary w-full">
          Créer l&apos;école
        </button>
      </form>
    </div>
  );
}
