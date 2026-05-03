import Link from "next/link";
import { ChevronRight, Plus, School as SchoolIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

export default async function AdminHomePage() {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();

  const [{ data: schools }, { count: directorsCount }] = await Promise.all([
    admin
      .from("schools")
      .select("id, name, address, is_active")
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "director"),
  ]);

  return (
    <div className="space-y-6">
      <section className="card border-0 bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          Tableau de bord
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Écoles" value={schools?.length ?? 0} />
          <Stat label="Directeurs" value={directorsCount ?? 0} />
        </div>
      </section>

      <Link href="/admin/schools/new" className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        Créer une école
      </Link>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Écoles</h2>
        {(schools ?? []).length === 0 ? (
          <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
            <SchoolIcon className="h-6 w-6" />
            <p className="text-sm">Aucune école pour le moment.</p>
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {schools!.map((s) => (
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
                  {!s.is_active && <span className="badge-amber">Inactive</span>}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
