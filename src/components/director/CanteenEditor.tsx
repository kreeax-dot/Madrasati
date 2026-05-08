"use client";

import { useState, useTransition } from "react";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { upsertCanteenMenu } from "@/app/actions/canteen";

const DAYS_LONG = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type Menu = {
  id: string;
  day_of_week: number;
  starter: string | null;
  main: string | null;
  dessert: string | null;
  notes: string | null;
};

export function CanteenEditor({
  weekStart,
  initial,
}: {
  weekStart: string;
  initial: Menu[];
}) {
  const days = [1, 2, 3, 4, 5];
  const map = new Map<number, Menu>();
  initial.forEach((m) => map.set(m.day_of_week, m));

  return (
    <div className="space-y-3">
      <div className="card flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <UtensilsCrossed className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">Semaine du</p>
          <p className="text-sm font-semibold text-slate-900">
            {new Date(weekStart).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {days.map((d) => (
        <DayCard
          key={d}
          day={d}
          weekStart={weekStart}
          existing={map.get(d) ?? null}
        />
      ))}
    </div>
  );
}

function DayCard({
  day,
  weekStart,
  existing,
}: {
  day: number;
  weekStart: string;
  existing: Menu | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    fd.set("day_of_week", String(day));
    fd.set("week_start", weekStart);
    startTransition(async () => {
      try {
        await upsertCanteenMenu(fd);
        setOpen(false);
      } catch (e: any) {
        setErr(e?.message ?? "Erreur");
      }
    });
  }

  const summary = existing
    ? [existing.starter, existing.main, existing.dessert].filter(Boolean).join(" · ")
    : null;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            {DAYS_LONG[day]}
          </p>
          <p className="mt-0.5 truncate text-sm text-slate-700">
            {summary || "Aucun menu"}
          </p>
        </div>
        <span className="text-xs font-medium text-brand-600">
          {open ? "Fermer" : existing ? "Modifier" : "Ajouter"}
        </span>
      </button>

      {open && (
        <form
          onSubmit={onSubmit}
          className="space-y-3 border-t border-slate-100 p-4"
        >
          <div>
            <label className="label">Entrée</label>
            <input
              name="starter"
              defaultValue={existing?.starter ?? ""}
              className="input"
              placeholder="Salade verte"
            />
          </div>
          <div>
            <label className="label">Plat</label>
            <input
              name="main"
              defaultValue={existing?.main ?? ""}
              className="input"
              placeholder="Couscous au poulet"
            />
          </div>
          <div>
            <label className="label">Dessert</label>
            <input
              name="dessert"
              defaultValue={existing?.dessert ?? ""}
              className="input"
              placeholder="Fruit de saison"
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <input
              name="notes"
              defaultValue={existing?.notes ?? ""}
              className="input"
              placeholder="Allergies, etc."
            />
          </div>
          {err && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </form>
      )}
    </div>
  );
}
