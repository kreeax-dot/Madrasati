import { Repeat } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default async function RemedialsPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  let query = supabase
    .from("remedials")
    .select("id, session_date, duration_minutes, reason, student_id, students(full_name)")
    .order("session_date", { ascending: false });

  if (profile.role === "student" && profile.student_id) {
    query = query.eq("student_id", profile.student_id);
  } else if (profile.role === "parent") {
    const { data: kids } = await supabase
      .from("students")
      .select("id")
      .eq("parent_id", profile.id);
    const ids = (kids ?? []).map((k: any) => k.id);
    if (ids.length === 0) {
      return <EmptyShell />;
    }
    query = query.in("student_id", ids);
  }

  const { data: items } = await query;

  return (
    <div className="space-y-5">
      <Realtime tables={["remedials"]} />
      <TopBar subtitle="Sessions de soutien" title="Rattrapages" />
      {(items ?? []).length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <Repeat className="h-6 w-6" />
          <p className="text-sm">Aucun rattrapage programmé.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items!.map((r: any) => (
            <li key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    {formatDate(r.session_date)}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {r.reason ?? "Rattrapage"}
                  </p>
                  {profile.role !== "student" && r.students?.full_name && (
                    <p className="mt-1 text-xs text-slate-500">
                      {r.students.full_name}
                    </p>
                  )}
                </div>
                <span className="badge-blue shrink-0">
                  {formatDuration(r.duration_minutes)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyShell() {
  return (
    <div className="space-y-5">
      <TopBar subtitle="Sessions de soutien" title="Rattrapages" />
      <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
        <Repeat className="h-6 w-6" />
        <p className="text-sm">Aucun rattrapage programmé.</p>
      </div>
    </div>
  );
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
  }
  return `${minutes} min`;
}
