import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

/**
 * Renders a red banner if the v7 schema/storage objects are missing — so the
 * director sees a clear instruction instead of silent failures on exams /
 * rattrapages / photos / avatar upload.
 *
 * Cheap: one HEAD count against `exams`. If that throws "does not exist" we
 * know the migration hasn't been applied. Returns null in all other cases.
 */
export async function MigrationBanner() {
  const { profile } = await getSessionProfile();
  if (profile.role !== "director") return null;

  const supabase = createClient();
  const { error } = await supabase
    .from("exams")
    .select("id", { count: "exact", head: true });

  if (!error) return null;
  const msg = error.message ?? "";
  const missing =
    msg.toLowerCase().includes("does not exist") ||
    (error as any).code === "42P01";
  if (!missing) return null;

  return (
    <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="min-w-0 text-sm text-amber-900">
        <p className="font-semibold">Migration v7 manquante</p>
        <p className="mt-0.5">
          Les nouvelles fonctionnalités (examens, rattrapages, photos, suppression
          de classe) nécessitent l&apos;exécution de{" "}
          <code className="rounded bg-white/60 px-1.5 py-0.5 text-xs">
            supabase/migration_v7.sql
          </code>{" "}
          dans Supabase → SQL Editor.
        </p>
      </div>
    </div>
  );
}
