import { Repeat } from "lucide-react";
import { st } from "@/lib/i18n/server";
import { TopBar } from "@/components/nav/TopBar";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { RemedialCreator } from "@/components/director/RemedialCreator";

export default async function RemedialsPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  // Build the remedials query — no embedded join to dodge FK ambiguity.
  let query = supabase
    .from("remedials")
    .select("id, session_date, duration_minutes, reason, student_id")
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
      return <Shell isDirector={false} items={[]} students={[]} />;
    }
    query = query.in("student_id", ids);
  } else if (profile.role === "director" && profile.school_id) {
    // Belt-and-suspenders school scoping in addition to RLS.
    query = query.eq("school_id", profile.school_id);
  }

  const { data: itemsRaw } = await query;
  const rawList = (itemsRaw as any[]) ?? [];

  // Resolve student names via a single batched query.
  const studentIds = Array.from(
    new Set(rawList.map((r) => r.student_id).filter(Boolean)),
  );
  const studentNameById = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: sts } = await supabase
      .from("students")
      .select("id, full_name")
      .in("id", studentIds);
    (sts ?? []).forEach((s: any) => studentNameById.set(s.id, s.full_name));
  }
  const items = rawList.map((r) => ({
    ...r,
    students: r.student_id
      ? { full_name: studentNameById.get(r.student_id) ?? "—" }
      : null,
  }));

  // Director: fetch the full student list so the create-sheet has a picker.
  let allStudents: { id: string; full_name: string }[] = [];
  if (profile.role === "director" && profile.school_id) {
    const { data: st } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("school_id", profile.school_id)
      .order("full_name");
    allStudents = (st as any[]) ?? [];
  }

  return (
    <Shell
      isDirector={profile.role === "director"}
      items={items}
      students={allStudents}
      showAuthor={profile.role !== "student"}
    />
  );
}

function Shell({
  isDirector,
  items,
  students,
  showAuthor = false,
}: {
  isDirector: boolean;
  items: any[];
  students: { id: string; full_name: string }[];
  showAuthor?: boolean;
}) {
  return (
    <div className="space-y-5">
      <Realtime tables={["remedials"]} />
      <TopBar
        subtitle={st("page.remedials.subtitle")}
        title={st("page.remedials.title")}
        icon={<Repeat className="h-5 w-5" />}
        accent="from-indigo-500 to-indigo-700"
      />

      {isDirector && <RemedialCreator students={students} />}

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <Repeat className="h-6 w-6" />
          <p className="text-sm">Aucun rattrapage programmé.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r: any) => (
            <li key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    {formatDate(r.session_date)}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {r.reason ?? "Rattrapage"}
                  </p>
                  {showAuthor && r.students?.full_name && (
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

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
  }
  return `${minutes} min`;
}
