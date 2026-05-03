import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { NewStudentForm } from "@/components/director/NewStudentForm";

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
        <p className="mt-1 text-sm text-slate-600">
          Un code de connexion sera généré automatiquement.
        </p>
      </div>

      <NewStudentForm classes={(classes as any[]) ?? []} />
    </div>
  );
}
