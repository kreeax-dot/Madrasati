import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, UserCog } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { FeatureToggles } from "@/components/admin/FeatureToggles";
import { CreateDirectorForm } from "@/components/admin/CreateDirectorForm";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import type { School, SchoolFeatures } from "@/types/database";

export default async function SchoolDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();

  const { data: school } = await admin
    .from("schools")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<School>();
  if (!school) notFound();

  const { data: directors } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "director")
    .eq("school_id", params.id);

  const features: SchoolFeatures = (school.features as SchoolFeatures) ?? {
    payments: true,
    messages: true,
    absences: true,
    schedule: true,
  };

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
        <h1 className="text-2xl font-bold tracking-tight">{school.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {school.address ?? "Aucune adresse"} · {school.phone ?? "—"}
        </p>
      </div>

      <ActiveToggle schoolId={school.id} active={school.is_active} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Fonctionnalités activées
        </h2>
        <FeatureToggles schoolId={school.id} initial={features} />
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
        <CreateDirectorForm schoolId={school.id} />
      </section>
    </div>
  );
}
