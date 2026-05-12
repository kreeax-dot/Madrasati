"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { createPayment, markPaymentPaid } from "@/app/actions/director";
import { formatCurrency, formatDate } from "@/lib/utils";

type Payment = {
  id: string;
  amount: number | string;
  status: "paid" | "pending" | "overdue";
  due_date: string;
  description: string;
  student_id: string;
  students?: { full_name: string } | null;
};

type Student = { id: string; full_name: string };

type Filter = "all" | "pending" | "paid";

export function PaymentsExplorer({
  payments,
  students,
}: {
  payments: Payment[];
  students: Student[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticPaid, setOptimisticPaid] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      const status = optimisticPaid.has(p.id) ? "paid" : p.status;
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return (
        p.description.toLowerCase().includes(q) ||
        (p.students?.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [payments, query, filter, optimisticPaid]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createPayment(fd);
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function onMarkPaid(id: string) {
    setOptimisticPaid((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await markPaymentPaid(id);
    });
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        {open ? "Annuler" : "Nouveau paiement"}
      </button>

      {open && (
        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          <div>
            <label className="label">Élève</label>
            <select name="student_id" required className="input">
              <option value="">— Sélectionner —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <input
              name="description"
              required
              className="input"
              placeholder="Frais mensuels — Mai"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Montant (DZD)</label>
              <input name="amount" type="number" min="1" required className="input" placeholder="12000" />
            </div>
            <div>
              <label className="label">Échéance</label>
              <input name="due_date" type="date" required className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="already_paid" className="h-4 w-4" />
            Déjà payé (enregistrer dans l&apos;historique)
          </label>
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-10"
          placeholder="Rechercher…"
        />
      </div>

      <div className="flex gap-2">
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>Tous</Pill>
        <Pill active={filter === "pending"} onClick={() => setFilter("pending")}>En attente</Pill>
        <Pill active={filter === "paid"} onClick={() => setFilter("paid")}>Payés</Pill>
      </div>

      {filtered.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          Aucun paiement.
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {filtered.map((p) => {
            const isPaid =
              p.status === "paid" || optimisticPaid.has(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {p.description}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {p.students?.full_name ?? "—"} · {formatDate(p.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(Number(p.amount))}
                  </p>
                  {isPaid ? (
                    <span className="badge-green">Payé</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMarkPaid(p.id)}
                      disabled={pending}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 active:scale-[0.97]"
                    >
                      <Check className="h-3 w-3" />
                      Marquer payé
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-emerald-600 text-white shadow-soft"
          : "bg-white border border-slate-200 text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
