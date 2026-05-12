import Link from "next/link";
import { AlertTriangle, ChevronRight, Plus, School as SchoolIcon, UserCog } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { OrphanDirectorsList } from "@/components/admin/OrphanDirectorsList";

type SchoolRow = {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean | null;
};
type OrphanDirector = { id: string; email: string; full_name: string };

export default async function AdminHomePage() {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();

  // Defensive: select * so a missing `is_active` column doesn't make the
  // query fail and return an empty list (the exact symptom of "0 schools").
  const schoolsRes = await admin
    .from("schools")
    .select("*")
    .order("created_at", { ascending: false });

  // Two director queries: total count (for the stat) and the orphan list
  // (school_id IS NULL — the "1 director / 0 schools" inconsistency).
  const [{ count: directorsCount }, { data: orphans }] = await Promise.all([
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "director"),
    admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "director")
      .is("school_id", null)
      .order("created_at", { ascending: false })
      .returns<OrphanDirector[]>(),
  ]);

  const schemaError =
    schoolsRes.error?.message?.toLowerCase().includes("does not exist")
      ? schoolsRes.error.message
      : null;

  const rawSchools = (schoolsRes.data ?? []) as SchoolRow[];
  // Treat NULL or missing is_active as ACTIVE — never hide a school because of
  // a missing column. Migration v6 backfills the value permanently.
  const schools = rawSchools.map((s) => ({
    ...s,
    is_active: s.is_active === false ? false : true,
  }));

  const orphanDirectors = (orphans ?? []) as OrphanDirector[];

  return (
    <div className="space-y-6">
      {schemaError && (
        <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">Schéma incomplet</p>
            <p className="mt-0.5">
              {schemaError}. Appliquez{" "}
              <code className="rounded bg-white/60 px-1.5 py-0.5 text-xs">
                supabase/migration_v6.sql
              </code>{" "}
              dans Supabase → SQL Editor.
            </p>
          </div>
        </div>
      )}

      <section className="card border-0 bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          Tableau de bord
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Écoles" value={schools.length} />
          <Stat label="Directeurs" value={directorsCount ?? 0} />
          <Stat label="Orphelins" value={orphanDirectors.length} />
        </div>
      </section>

      <Link href="/admin/schools/new" className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        Créer une école
      </Link>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Écoles</h2>
        {schools.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
            <SchoolIcon className="h-6 w-6" />
            <p className="text-sm">
              {schemaError
                ? "Liste indisponible jusqu'à la migration."
                : "Aucune école pour le moment."}
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {schools.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/schools/${s.id}`}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <SchoolIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {s.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {s.address ?? "Aucune adresse"}
                    </p>
                  </div>
                  {s.is_active ? (
                    <span className="badge-green">Active</span>
                  ) : (
                    <span className="badge-amber">Désactivée</span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {orphanDirectors.length > 0 && (
        <section>
          <div className="mb-3 flex items-start gap-2">
            <UserCog className="h-4 w-4 mt-0.5 text-amber-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                Directeurs orphelins
              </h2>
              <p className="text-xs text-slate-500">
                Sans école — réassignez ou supprimez.
              </p>
            </div>
          </div>
          <OrphanDirectorsList
            directors={orphanDirectors}
            schools={schools.map((s) => ({ id: s.id, name: s.name }))}
          />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-3">
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}
