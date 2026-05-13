import Link from "next/link";
import { UserPlus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { StudentsExplorer } from "@/components/director/StudentsExplorer";

export default async function StudentsPage() {
  const { profile } = await requireRole(["director", "parent"]);
  const supabase = createClient();

  // Defensive: fetch students WITHOUT an embedded class join. The embedded
  // syntax `classes(id, name)` silently returns null rows if the FK is
  // renamed/missing in some schema variants, which made the director's
  // list appear empty even when students existed in the DB.
  //
  // We fetch classes separately and stitch the relation in JS — bullet-proof.
  let studentsQuery = supabase
    .from("students")
    .select("id, full_name, class_id, avatar_url")
    .order("full_name");

  // Defense in depth: even if RLS hiccups, only ever return students of
  // the director's school. Parents go through RLS (parent_id = uid).
  if (profile.role === "director" && profile.school_id) {
    studentsQuery = studentsQuery.eq("school_id", profile.school_id);
  }

  const [studentsRes, classesRes] = await Promise.all([
    studentsQuery,
    profile.school_id
      ? supabase
          .from("classes")
          .select("id, name")
          .eq("school_id", profile.school_id)
          .order("name")
      : supabase.from("classes").select("id, name").order("name"),
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

  const isDirector = profile.role === "director";

  return (
    <div className="space-y-5">
      <TopBar
        subtitle={
          isDirector ? `Liste · ${students.length}` : "Liste"
        }
        title="Élèves"
      />

      {isDirector && (
        <Link href="/students/new" className="btn-primary w-full">
          <UserPlus className="h-4 w-4" />
          Ajouter un élève
        </Link>
      )}

      {isDirector && students.length === 0 && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Aucun élève visible.</p>
          <p className="mt-0.5">
            Si vous avez déjà créé des élèves, vérifiez que votre compte
            directeur est bien rattaché à votre école dans Supabase
            (table <code className="rounded bg-white/60 px-1 py-px">profiles</code> →
            colonne <code className="rounded bg-white/60 px-1 py-px">school_id</code>).
          </p>
        </div>
      )}

      <StudentsExplorer
        students={students}
        classes={classes}
        isDirector={isDirector}
      />
    </div>
  );
}
