"use client";

import { useMemo } from "react";
import { Clock, MapPin, User } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

/**
 * Week-view schedule layout — 4 columns (Sun-Wed) without Friday or Saturday.
 * Each column has its own brand color (matching the design reference) and
 * lists the slots for that day vertically. Pure UI; no logic change to the
 * schedule data model.
 */

// 4-day week: Sunday(0), Monday(1), Tuesday(2), Wednesday(3), Thursday(4)
// (Sat=6 and Fri=5 are dropped per spec.)
const WEEK_DAYS = [0, 1, 2, 3, 4] as const;
const DAY_KEYS: Record<number, DictionaryKey> = {
  0: "day.0",
  1: "day.1",
  2: "day.2",
  3: "day.3",
  4: "day.4",
  5: "day.5",
  6: "day.6",
};

// Per-column accent (background gradient).
const DAY_COLORS: Record<number, { bg: string; chip: string; ring: string }> = {
  0: { bg: "bg-orange-400", chip: "bg-white text-orange-700", ring: "ring-orange-200" },
  1: { bg: "bg-pink-400", chip: "bg-white text-pink-700", ring: "ring-pink-200" },
  2: { bg: "bg-amber-400", chip: "bg-white text-amber-800", ring: "ring-amber-200" },
  3: { bg: "bg-emerald-400", chip: "bg-white text-emerald-700", ring: "ring-emerald-200" },
  4: { bg: "bg-sky-400", chip: "bg-white text-sky-700", ring: "ring-sky-200" },
  5: { bg: "bg-slate-300", chip: "bg-white text-slate-700", ring: "ring-slate-200" },
  6: { bg: "bg-slate-300", chip: "bg-white text-slate-700", ring: "ring-slate-200" },
};

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
  const { t } = useTranslation();

  // Group by day so we can render a column per day.
  const byDay = useMemo(() => {
    const map = new Map<number, Slot[]>();
    WEEK_DAYS.forEach((d) => map.set(d, []));
    schedules
      .filter((s) => WEEK_DAYS.includes(s.day_of_week as any))
      .forEach((s) => {
        const arr = map.get(s.day_of_week) ?? [];
        arr.push(s);
        map.set(s.day_of_week, arr);
      });
    map.forEach((arr) =>
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time)),
    );
    return map;
  }, [schedules]);

  return (
    <div className="space-y-4">
      {/* Week grid: 5 columns wide (one per day), horizontally scrollable
          on narrow screens, snug on wider phones. */}
      <div className="-mx-5 overflow-x-auto px-5 pb-2">
        <div className="grid min-w-[640px] grid-cols-5 gap-2">
          {WEEK_DAYS.map((d) => {
            const color = DAY_COLORS[d];
            const slots = byDay.get(d) ?? [];
            return (
              <div key={d} className="rounded-2xl bg-white shadow-soft border border-slate-100 overflow-hidden">
                <div
                  className={`${color.bg} px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-white`}
                >
                  {t(DAY_KEYS[d])}
                </div>
                <div className="p-2 space-y-1.5 min-h-[200px]">
                  {slots.length === 0 ? (
                    <p className="py-6 text-center text-[10px] text-slate-300">—</p>
                  ) : (
                    slots.map((s) => (
                      <div
                        key={s.id}
                        className={`rounded-xl ${color.chip} px-2 py-2 text-xs shadow-soft ring-1 ${color.ring}`}
                      >
                        <p className="font-bold leading-tight">{s.subject}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] opacity-80">
                          <Clock className="h-2.5 w-2.5" />
                          {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </p>
                        {s.teacher && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] opacity-70">
                            <User className="h-2.5 w-2.5" />
                            {s.teacher}
                          </p>
                        )}
                        {s.room && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] opacity-70">
                            <MapPin className="h-2.5 w-2.5" />
                            {s.room}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
