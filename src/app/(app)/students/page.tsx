import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { StudentsExplorer } from "@/components/director/StudentsExplorer";

export default async function StudentsPage() {
  const { profile } = await requireRole(["director", "parent"]);

  const isDirector = profile.role === "director";

  // Director path uses the admin client so any RLS / current_school_id drift
  // can never hide students from the legitimate owner. We re-apply the
  // school_id filter ourselves — role + school check is done by requireRole
  // and the layout's NotProvisioned guard.
  const supabase = createClient();
  const reader = isDirector && profile.school_id ? createAdminClient() : supabase;

  let studentsQuery = reader
    .from("students")
    .select("id, full_name, class_id, avatar_url, school_id")
    .order("full_name");

  if (isDirector && profile.school_id) {
    studentsQuery = studentsQuery.eq("school_id", profile.school_id);
  } else if (profile.role === "parent") {
    studentsQuery = studentsQuery.eq("parent_id", profile.id);
  }

  const [studentsRes, classesRes] = await Promise.all([
    studentsQuery,
    profile.school_id
      ? reader
          .from("classes")
          .select("id, name")
          .eq("school_id", profile.school_id)
          .order("name")
      : reader.from("classes").select("id, name").order("name"),
  ]);

  const studentsRaw = (studentsRes.data as any[]) ?? [];
  const classes = (classesRes.data as any[]) ?? [];

  const classById = new Map<string, { id: string; name: string }>(
    classes.map((c: any) => [c.id, c]),
  );

  const students = studentsRaw.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    class_id: s.class_id,
    avatar_url: s.avatar_url ?? null,
    classes: s.class_id ? classById.get(s.class_id) ?? null : null,
  }));

  return (
    <div className="space-y-5">
      <TopBar
        subtitle={
          isDirector ? `${students.length} élève${students.length > 1 ? "s" : ""}` : "Liste"
        }
        title="Élèves"
        icon={<Users className="h-5 w-5" />}
        accent="from-emerald-500 to-emerald-700"
      />

      {isDirector && (
        <Link href="/students/new" className="btn-primary w-full">
          <UserPlus className="h-4 w-4" />
          Ajouter un élève
        </Link>
      )}

      <StudentsExplorer
        students={students}
        classes={classes}
        isDirector={isDirector}
      />
    </div>
  );
}
