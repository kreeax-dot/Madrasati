import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ScheduleEditor } from "@/components/director/ScheduleEditor";
import { ScheduleViewer } from "@/components/schedule/ScheduleViewer";
import { Realtime } from "@/components/Realtime";

export default async function SchedulePage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const [{ data: classes }, { data: schedules }] = await Promise.all([
    supabase.from("classes").select("id, name").order("name"),
    supabase
      .from("schedules")
      .select("id, class_id, day_of_week, start_time, end_time, subject, teacher, room")
      .order("day_of_week")
      .order("start_time"),
  ]);

  if (profile.role === "director") {
    return (
      <div className="space-y-5">
        <Realtime tables={["schedules"]} />
        <TopBar subtitle="Emploi du temps" title="Horaires" />
        <ScheduleEditor
          classes={(classes as any[]) ?? []}
          schedules={(schedules as any[]) ?? []}
        />
      </div>
    );
  }

  // For parent/student: filter to their own class only.
  let visible = (schedules as any[]) ?? [];
  if (profile.role === "parent") {
    const { data: kids } = await supabase
      .from("students")
      .select("class_id")
      .eq("parent_id", profile.id);
    const classIds = new Set((kids ?? []).map((k: any) => k.class_id).filter(Boolean));
    visible = visible.filter((s) => classIds.has(s.class_id));
  } else if (profile.role === "student" && profile.student_id) {
    const { data: me } = await supabase
      .from("students")
      .select("class_id")
      .eq("id", profile.student_id)
      .maybeSingle();
    if (me?.class_id) visible = visible.filter((s) => s.class_id === me.class_id);
    else visible = [];
  }

  return (
    <div className="space-y-5">
      <Realtime tables={["schedules"]} />
      <TopBar subtitle="Cette semaine" title="Emploi du temps" />
      <ScheduleViewer schedules={visible} />
    </div>
  );
}
