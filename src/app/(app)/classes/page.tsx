import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { ClassesList } from "@/components/director/ClassesList";

export default async function ClassesPage() {
  const { profile } = await requireRole(["director"]);

  // Use admin client to avoid any RLS drift hiding the director's classes.
  const reader = profile.school_id ? createAdminClient() : createClient();

  let classesQuery = reader.from("classes").select("id, name, level").order("name");
  let countsQuery = reader.from("students").select("class_id");

  if (profile.school_id) {
    classesQuery = classesQuery.eq("school_id", profile.school_id);
    countsQuery = countsQuery.eq("school_id", profile.school_id);
  }

  const [{ data: classes }, { data: counts }] = await Promise.all([
    classesQuery,
    countsQuery,
  ]);

  const tally: Record<string, number> = {};
  (counts ?? []).forEach((s: any) => {
    if (s.class_id) tally[s.class_id] = (tally[s.class_id] ?? 0) + 1;
  });

  const list = (classes as any[]) ?? [];

  return (
    <div className="space-y-5">
      <TopBar
        subtitle={`${list.length} classe${list.length > 1 ? "s" : ""}`}
        title="Classes"
        icon={<GraduationCap className="h-5 w-5" />}
        accent="from-brand-500 to-brand-700"
      />

      <Link href="/classes/new" className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        Créer une classe
      </Link>

      <ClassesList classes={list} counts={tally} />
    </div>
  );
}
