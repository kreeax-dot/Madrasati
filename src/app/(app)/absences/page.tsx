import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { AbsenceCreator } from "@/components/director/AbsenceCreator";
import { Realtime } from "@/components/Realtime";

export default async function AbsencesPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const { data: absences } = await supabase
    .from("absences")
    .select("id, date, reason, justified, students(full_name)")
    .order("date", { ascending: false });

  const isDirector = profile.role === "director";
  const { data: students } = isDirector
    ? await supabase.from("students").select("id, full_name").order("full_name")
    : { data: [] as any[] };

  return (
    <div className="space-y-5">
      <Realtime tables={["absences"]} />
      <TopBar subtitle="Suivi" title="Absences" />

      {isDirector && <AbsenceCreator students={(students as any[]) ?? []} />}

      <ul className="card divide-y divide-slate-100">
        {(absences ?? []).length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-400">
            Aucune absence enregistrée.
          </li>
        ) : (
          absences!.map((a: any) => (
            <li key={a.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {a.students?.full_name ?? "—"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {formatDate(a.date)} · {a.reason ?? "Sans motif"}
                </p>
              </div>
              {a.justified ? (
                <span className="badge-green">Justifiée</span>
              ) : (
                <span className="badge-amber">Non justifiée</span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
