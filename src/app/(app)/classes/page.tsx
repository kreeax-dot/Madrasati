import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export default async function ClassesPage() {
  await requireRole(["director"]);
  const supabase = createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, level")
    .order("name");

  const { data: counts } = await supabase
    .from("students")
    .select("class_id");

  const tally = new Map<string, number>();
  (counts ?? []).forEach((s: any) => {
    if (s.class_id) tally.set(s.class_id, (tally.get(s.class_id) ?? 0) + 1);
  });

  return (
    <div className="space-y-5">
      <TopBar subtitle="Organisation" title="Classes" />

      <Link href="/classes/new" className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        Créer une classe
      </Link>

      {(classes ?? []).length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <GraduationCap className="h-6 w-6" />
          <p className="text-sm">Aucune classe pour le moment.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {classes!.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {c.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {c.level ?? "—"} · {tally.get(c.id) ?? 0} élève(s)
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
