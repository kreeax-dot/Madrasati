"use client";

import { useMemo, useState } from "react";
import { Clock, MapPin, User } from "lucide-react";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAYS_LONG = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

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

export function ScheduleViewer({ schedules }: { schedules: Slot[] }) {
  const today = new Date().getDay();
  const [day, setDay] = useState<number>(today);

  const items = useMemo(
    () =>
      schedules
        .filter((s) => s.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [schedules, day],
  );

  const dayCounts = useMemo(() => {
    const counts = new Array(7).fill(0);
    schedules.forEach((s) => {
      counts[s.day_of_week] += 1;
    });
    return counts;
  }, [schedules]);

  return (
    <div className="space-y-4">
      <div className="-mx-5 px-5 overflow-x-auto">
        <div className="flex gap-2">
          {DAYS.map((d, i) => {
            const active = i === day;
            const count = dayCounts[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDay(i)}
                className={`flex shrink-0 flex-col items-center rounded-2xl px-4 py-2.5 transition active:scale-[0.97] ${
                  active
                    ? "bg-orange-500 text-white shadow-soft"
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {d}
                </span>
                <span className="mt-0.5 text-base font-bold leading-none">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="section-title">{DAYS_LONG[day]}</p>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <Clock className="h-6 w-6" />
          <p className="text-sm">Pas de cours ce jour-là.</p>
        </div>
      ) : (
        <ul className="relative space-y-3 pl-6">
          <span className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
          {items.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[18px] top-3 h-3 w-3 rounded-full bg-orange-500 ring-4 ring-orange-100" />
              <div className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
                      {s.subject}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                    </p>
                  </div>
                </div>
                {(s.teacher || s.room) && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {s.teacher && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> {s.teacher}
                      </span>
                    )}
                    {s.room && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.room}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
