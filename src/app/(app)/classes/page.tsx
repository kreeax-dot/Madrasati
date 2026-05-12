import Link from "next/link";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ClassesList } from "@/components/director/ClassesList";

export default async function ClassesPage() {
  await requireRole(["director"]);
  const supabase = createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, level")
    .order("name");

  const { data: counts } = await supabase
    .from("students")
    .select("class_id");

  const tally: Record<string, number> = {};
  (counts ?? []).forEach((s: any) => {
    if (s.class_id) tally[s.class_id] = (tally[s.class_id] ?? 0) + 1;
  });

  return (
    <div className="space-y-5">
      <TopBar subtitle="Organisation" title="Classes" />

      <Link href="/classes/new" className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        Créer une classe
      </Link>

      <ClassesList classes={(classes as any[]) ?? []} counts={tally} />
    </div>
  );
}
