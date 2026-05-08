import { Wallet } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Realtime } from "@/components/Realtime";
import { PaymentsExplorer } from "@/components/payments/PaymentsExplorer";

export default async function PaymentsPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, due_date, paid_at, description, student_id, students(full_name)")
    .order("due_date", { ascending: false });

  const list = (payments as any[]) ?? [];
  const totals = list.reduce(
    (acc, p) => {
      if (p.status === "paid") acc.paid += Number(p.amount);
      else acc.pending += Number(p.amount);
      return acc;
    },
    { paid: 0, pending: 0 },
  );

  const isDirector = profile.role === "director";

  if (isDirector) {
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name")
      .order("full_name");
    return (
      <div className="space-y-5">
        <Realtime tables={["payments"]} />
        <TopBar subtitle="Suivi" title="Paiements" />
        <Totals paid={totals.paid} pending={totals.pending} />
        <PaymentsExplorer
          payments={list}
          students={(students as any[]) ?? []}
        />
      </div>
    );
  }

  // Parent / student view
  const upcoming = list
    .filter((p) => p.status !== "paid")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const next = upcoming[0];

  return (
    <div className="space-y-5">
      <Realtime tables={["payments"]} />
      <TopBar subtitle="Mes paiements" title="Paiements" />

      {next && (
        <div className="card border-0 bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">
            Prochaine échéance
          </p>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(Number(next.amount))}</p>
          <p className="mt-1 text-sm text-white/90">{next.description}</p>
          <p className="mt-2 text-xs text-white/80">
            À régler avant le {formatDate(next.due_date)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Réglé" value={formatCurrency(totals.paid)} tone="emerald" />
        <Stat label="Restant" value={formatCurrency(totals.pending)} tone="amber" />
      </div>

      <section>
        <p className="section-title mb-2">Historique</p>
        {list.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
            <Wallet className="h-6 w-6" />
            <p className="text-sm">Aucun paiement.</p>
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {list.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {p.description}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {p.students?.full_name ?? "—"} · {formatDate(p.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(Number(p.amount))}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Totals({ paid, pending }: { paid: number; pending: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Encaissé" value={formatCurrency(paid)} tone="emerald" />
      <Stat label="En attente" value={formatCurrency(pending)} tone="amber" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber";
}) {
  const map: Record<string, string> = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${map[tone]}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge-green">Payé</span>;
  if (status === "overdue") return <span className="badge-red">En retard</span>;
  return <span className="badge-amber">En attente</span>;
}
