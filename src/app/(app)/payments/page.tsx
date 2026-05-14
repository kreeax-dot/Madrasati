import { Check, Clock, Wallet } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Realtime } from "@/components/Realtime";
import { PaymentsExplorer } from "@/components/payments/PaymentsExplorer";

export default async function PaymentsPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select(
      "id, amount, status, due_date, paid_at, description, student_id",
    )
    .order("due_date", { ascending: false });

  const rawList = (paymentsRaw as any[]) ?? [];
  // Resolve student names via a separate query — avoids embedded-join crashes.
  let studentNameById = new Map<string, string>();
  if (rawList.length > 0) {
    const ids = Array.from(
      new Set(rawList.map((p) => p.student_id).filter(Boolean)),
    );
    if (ids.length > 0) {
      const { data: sts } = await supabase
        .from("students")
        .select("id, full_name")
        .in("id", ids);
      (sts ?? []).forEach((s: any) => studentNameById.set(s.id, s.full_name));
    }
  }
  const list = rawList.map((p) => ({
    ...p,
    students: p.student_id
      ? { full_name: studentNameById.get(p.student_id) ?? "—" }
      : null,
  }));
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
        <TopBar
          subtitle="Suivi"
          title="Paiements"
          icon={<Wallet className="h-5 w-5" />}
          accent="from-emerald-500 to-emerald-700"
        />
        <Totals paid={totals.paid} pending={totals.pending} />
        <PaymentsExplorer
          payments={list}
          students={(students as any[]) ?? []}
        />
      </div>
    );
  }

  // Parent / student view — clean split: upcoming (or overdue) vs history.
  const upcoming = list
    .filter((p) => p.status !== "paid")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const history = list
    .filter((p) => p.status === "paid")
    .sort((a, b) =>
      (b.paid_at ?? b.due_date).localeCompare(a.paid_at ?? a.due_date),
    );
  const next = upcoming[0];

  return (
    <div className="space-y-5">
      <Realtime tables={["payments"]} />
      <TopBar
        subtitle="Mes paiements"
        title="Paiements"
        icon={<Wallet className="h-5 w-5" />}
        accent="from-emerald-500 to-emerald-700"
      />

      {next ? (
        <div className="card border-0 bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">
            Prochaine échéance
          </p>
          <p className="mt-2 text-3xl font-bold">
            {formatCurrency(Number(next.amount))}
          </p>
          <p className="mt-1 text-sm text-white/90">{next.description}</p>
          <p className="mt-2 text-xs text-white/80">
            À régler avant le {formatDate(next.due_date)}
          </p>
        </div>
      ) : (
        <div className="card flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Check className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Aucun paiement à venir</p>
            <p className="mt-0.5 text-xs">Tout est à jour.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Réglé" value={formatCurrency(totals.paid)} tone="emerald" />
        <Stat label="Restant" value={formatCurrency(totals.pending)} tone="amber" />
      </div>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h2 className="section-title">À venir</h2>
          <span className="text-[11px] text-slate-400">· {upcoming.length}</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            Rien d&apos;exigible.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {upcoming.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-500" />
          <h2 className="section-title">Historique</h2>
          <span className="text-[11px] text-slate-400">· {history.length}</span>
        </div>
        {history.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            Aucun paiement réglé pour le moment.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {history.map((p) => (
              <PaymentRow key={p.id} payment={p} historic />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PaymentRow({
  payment,
  historic = false,
}: {
  payment: any;
  historic?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {payment.description}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {payment.students?.full_name ?? "—"} ·{" "}
          {historic && payment.paid_at
            ? `Payé le ${formatDate(payment.paid_at)}`
            : `Échéance ${formatDate(payment.due_date)}`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-900">
          {formatCurrency(Number(payment.amount))}
        </p>
        <StatusBadge status={payment.status} />
      </div>
    </li>
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
