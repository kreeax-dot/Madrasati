import { GraduationCap } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { ExamEditor } from "@/components/director/ExamEditor";

export default async function ExamsPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const [{ data: classesRaw }, { data: examsRaw }] = await Promise.all([
    supabase.from("classes").select("id, name").order("name"),
    supabase
      .from("exams")
      .select("id, class_id, subject, exam_date, description")
      .order("exam_date", { ascending: true }),
  ]);

  const classes = (classesRaw as any[]) ?? [];
  const examsList = (examsRaw as any[]) ?? [];
  const classNameById = new Map<string, string>(
    classes.map((c: any) => [c.id, c.name]),
  );
  const exams = examsList.map((e: any) => ({
    ...e,
    classes: e.class_id ? { name: classNameById.get(e.class_id) ?? "" } : null,
  }));

  if (profile.role === "director") {
    return (
      <div className="space-y-5">
        <Realtime tables={["exams"]} />
        <TopBar subtitle="Évaluations" title="Examens" />
        <ExamEditor classes={classes} exams={exams} />
      </div>
    );
  }

  // Filter for parent/student to their class only.
  let visible = exams;
  if (profile.role === "parent") {
    const { data: kids } = await supabase
      .from("students")
      .select("class_id")
      .eq("parent_id", profile.id);
    const classIds = new Set((kids ?? []).map((k: any) => k.class_id).filter(Boolean));
    visible = visible.filter((s: any) => classIds.has(s.class_id));
  } else if (profile.role === "student" && profile.student_id) {
    const { data: me } = await supabase
      .from("students")
      .select("class_id")
      .eq("id", profile.student_id)
      .maybeSingle();
    visible = me?.class_id ? visible.filter((s: any) => s.class_id === me.class_id) : [];
  }

  const today = new Date().toISOString().slice(0, 10);
  visible = visible.filter((e: any) => e.exam_date >= today);

  return (
    <div className="space-y-5">
      <Realtime tables={["exams"]} />
      <TopBar subtitle="À venir" title="Examens" />
      {visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <GraduationCap className="h-6 w-6" />
          <p className="text-sm">Aucun examen programmé.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((h: any) => (
            <li key={h.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-rose-600">
                    {h.subject}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatDate(h.exam_date)}
                  </p>
                  {h.description && (
                    <p className="mt-1 text-sm text-slate-600">{h.description}</p>
                  )}
                </div>
                <span className="badge bg-rose-50 text-rose-700 shrink-0">
                  Examen
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
