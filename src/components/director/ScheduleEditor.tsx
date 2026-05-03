"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createSchedule, deleteSchedule } from "@/app/actions/director";
import { useRouter } from "next/navigation";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type Cls = { id: string; name: string };
type Slot = {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
};

export function ScheduleEditor({
  classes,
  schedules,
}: {
  classes: Cls[];
  schedules: Slot[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(classes[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticDeleted, setOptimisticDeleted] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      schedules.filter(
        (s) => s.class_id === selected && !optimisticDeleted.has(s.id),
      ),
    [schedules, selected, optimisticDeleted],
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("class_id", selected);
    startTransition(async () => {
      try {
        await createSchedule(fd);
        (e.target as HTMLFormElement).reset();
        setShowForm(false);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  function onDelete(id: string) {
    setOptimisticDeleted((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await deleteSchedule(id);
      router.refresh();
    });
  }

  if (classes.length === 0) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-slate-500">
        Créez d&apos;abord une classe dans <span className="font-medium">Classes</span>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Classe</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="btn-primary w-full"
      >
        <Plus className="h-4 w-4" />
        {showForm ? "Annuler" : "Ajouter un cours"}
      </button>

      {showForm && (
        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          <div>
            <label className="label">Matière</label>
            <input name="subject" required className="input" placeholder="Mathématiques" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Jour</label>
              <select name="day_of_week" required className="input">
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Salle</label>
              <input name="room" className="input" placeholder="A12" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Début</label>
              <input name="start_time" type="time" required className="input" />
            </div>
            <div>
              <label className="label">Fin</label>
              <input name="end_time" type="time" required className="input" />
            </div>
          </div>
          <div>
            <label className="label">Enseignant</label>
            <input name="teacher" className="input" placeholder="M. Belkacem" />
          </div>
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

      {filtered.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          Aucun cours pour cette classe.
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {filtered
            .sort(
              (a, b) =>
                a.day_of_week - b.day_of_week ||
                a.start_time.localeCompare(b.start_time),
            )
            .map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <div className="w-16 text-xs font-medium text-slate-500">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {DAYS[s.day_of_week].slice(0, 3)}
                  </p>
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {s.subject}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {s.teacher ?? "—"} · {s.room ?? "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
