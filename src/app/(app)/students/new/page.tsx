import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createStudent } from "@/app/actions/director";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export default async function NewStudentPage() {
  await requireRole(["director"]);
  const supabase = createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-5">
      <Link
        href="/students"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouvel élève</h1>
      </div>

      <form action={createStudent} className="space-y-4">
        <div>
          <label className="label">Nom complet</label>
          <input name="full_name" required className="input" placeholder="Amina Benali" />
        </div>
        <div>
          <label className="label">Classe</label>
          <select name="class_id" className="input">
            <option value="">— Aucune classe —</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary w-full">
          Ajouter l&apos;élève
        </button>
      </form>
    </div>
  );
}
