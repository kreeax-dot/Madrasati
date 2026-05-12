import Link from "next/link";
import { UserPlus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { StudentsExplorer } from "@/components/director/StudentsExplorer";

export default async function StudentsPage() {
  const { profile } = await requireRole(["director", "parent"]);
  const supabase = createClient();

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, class_id, avatar_url, classes(id, name)")
      .order("full_name"),
    supabase.from("classes").select("id, name").order("name"),
  ]);

  const isDirector = profile.role === "director";

  return (
    <div className="space-y-5">
      <TopBar subtitle="Liste" title="Élèves" />

      {isDirector && (
        <Link href="/students/new" className="btn-primary w-full">
          <UserPlus className="h-4 w-4" />
          Ajouter un élève
        </Link>
      )}

      <StudentsExplorer
        students={(students as any[]) ?? []}
        classes={(classes as any[]) ?? []}
        isDirector={isDirector}
      />
    </div>
  );
}
