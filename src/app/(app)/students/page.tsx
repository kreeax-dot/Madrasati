import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";
import { requireRole } from "@/lib/auth";
import { ClassAssigner } from "@/components/director/ClassAssigner";

export default async function StudentsPage() {
  const { profile } = await requireRole(["director", "parent"]);
  const supabase = createClient();

  const studentsQ = supabase
    .from("students")
    .select("id, full_name, class_id, classes(name)")
    .order("full_name");

  const [{ data: students }, { data: classes }] = await Promise.all([
    studentsQ,
    profile.role === "director"
      ? supabase.from("classes").select("id, name").order("name")
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const isDirector = profile.role === "director";

  return (
    <div className="space-y-5">
      <TopBar subtitle="Liste" title="Élèves" />

      {isDirector && (
        <Link href="/students/new" className="btn-primary w-full">
          <UserPlus className="h-4 w-4" />
          Ajouter un élève
        </Link>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input placeholder="Rechercher…" className="input pl-10" />
      </div>

      <ul className="card divide-y divide-slate-100">
        {(students ?? []).length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-400">
            Aucun élève pour le moment.
          </li>
        ) : (
          students!.map((s: any) => (
            <li key={s.id} className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                {initials(s.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {s.full_name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {s.classes?.name ?? "Sans classe"}
                </p>
              </div>
              {isDirector && (
                <ClassAssigner
                  studentId={s.id}
                  classId={s.class_id}
                  classes={(classes as any[]) ?? []}
                />
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
