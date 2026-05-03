import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PaymentsPage() {
  const supabase = createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, due_date, description, students(full_name)")
    .order("due_date", { ascending: false });

  const totals = (payments ?? []).reduce(
    (acc, p) => {
      if (p.status === "paid") acc.paid += p.amount;
      else acc.pending += p.amount;
      return acc;
    },
    { paid: 0, pending: 0 },
  );

  return (
    <div className="space-y-5">
      <TopBar subtitle="Suivi" title="Paiements" />

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Encaissé
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-600">
            {formatCurrency(totals.paid)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            En attente
          </p>
          <p className="mt-1 text-xl font-bold text-amber-600">
            {formatCurrency(totals.pending)}
          </p>
        </div>
      </div>

      <ul className="card divide-y divide-slate-100">
        {(payments ?? []).length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-400">
            Aucun paiement pour le moment.
          </li>
        ) : (
          payments!.map((p: any) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {p.description}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {p.students?.full_name ?? "—"} · échéance {formatDate(p.due_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(p.amount)}
                </p>
                <StatusBadge status={p.status} />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge-green">Payé</span>;
  if (status === "overdue") return <span className="badge-red">En retard</span>;
  return <span className="badge-amber">En attente</span>;
}
