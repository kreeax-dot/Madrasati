import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ScheduleEditor } from "@/components/director/ScheduleEditor";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default async function SchedulePage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  let classId: string | null = null;

  if (profile.role === "parent") {
    const { data: kids } = await supabase
      .from("students")
      .select("class_id")
      .eq("parent_id", profile.id)
      .limit(1);
    classId = kids?.[0]?.class_id ?? null;
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, class_id, day_of_week, start_time, end_time, subject, teacher, room")
    .order("day_of_week")
    .order("start_time");

  if (profile.role === "director") {
    return (
      <div className="space-y-5">
        <TopBar subtitle="Emploi du temps" title="Horaires" />
        <ScheduleEditor classes={(classes as any[]) ?? []} schedules={(schedules as any[]) ?? []} />
      </div>
    );
  }

  const filtered = (schedules ?? []).filter((s: any) =>
    classId ? s.class_id === classId : true,
  );

  const grouped = new Map<number, any[]>();
  filtered.forEach((s: any) => {
    if (!grouped.has(s.day_of_week)) grouped.set(s.day_of_week, []);
    grouped.get(s.day_of_week)!.push(s);
  });

  return (
    <div className="space-y-5">
      <TopBar subtitle="Emploi du temps" title="Horaires" />
      {filtered.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          Aucun horaire publié.
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries())
            .sort(([a], [b]) => a - b)
            .map(([day, items]) => (
              <div key={day}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {DAYS[day]}
                </p>
                <ul className="card divide-y divide-slate-100">
                  {items.map((s: any) => (
                    <li key={s.id} className="flex items-center gap-3 p-3">
                      <div className="w-16 text-xs font-medium text-slate-500">
                        {s.start_time.slice(0, 5)}
                        <br />
                        <span className="text-slate-300">
                          {s.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {s.subject}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {s.teacher ?? "—"} · {s.room ?? "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
