import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, UserCog } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { FeatureToggles } from "@/components/admin/FeatureToggles";
import { CreateDirectorForm } from "@/components/admin/CreateDirectorForm";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { DeleteSchoolButton } from "@/components/admin/DeleteSchoolButton";
import type { SchoolFeatures } from "@/types/database";

const DEFAULT_FEATURES: SchoolFeatures = {
  payments: true,
  messages: true,
  absences: true,
  schedule: true,
};

export default async function SchoolDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();

  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (schoolErr) {
    throw new Error(
      `Impossible de charger l'école : ${schoolErr.message}. ` +
        `Vérifiez les migrations (v2 / v6).`,
    );
  }
  if (!school) notFound();

  const [{ data: directors }, { count: studentsCount }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "director")
      .eq("school_id", params.id),
    admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", params.id),
  ]);

  // Defensive coercion — older rows may have NULL features / is_active before
  // migration v6 backfilled them. Never let a missing column hide the school.
  const features: SchoolFeatures = {
    ...DEFAULT_FEATURES,
    ...((school as any).features ?? {}),
  };
  const isActive =
    (school as any).is_active === false ? false : true;

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          École
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {(school as any).name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {(school as any).address ?? "Aucune adresse"} ·{" "}
          {(school as any).phone ?? "—"}
        </p>
      </div>

      <ActiveToggle schoolId={(school as any).id} active={isActive} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Fonctionnalités activées
        </h2>
        <FeatureToggles schoolId={(school as any).id} initial={features} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Directeurs</h2>
        {(directors ?? []).length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            Aucun directeur affecté.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {directors!.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <UserCog className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {d.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-500 inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {d.email}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Créer un directeur
        </h2>
        <CreateDirectorForm schoolId={(school as any).id} />
      </section>

      <section className="pt-2">
        <h2 className="mb-3 text-sm font-semibold text-red-700">Zone de danger</h2>
        <DeleteSchoolButton
          schoolId={(school as any).id}
          schoolName={(school as any).name}
          studentsCount={studentsCount ?? 0}
          directorsCount={(directors ?? []).length}
        />
      </section>
    </div>
  );
}
