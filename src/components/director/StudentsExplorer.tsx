"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { initials } from "@/lib/utils";
import { ClassAssigner } from "./ClassAssigner";

type Student = {
  id: string;
  full_name: string;
  class_id: string | null;
  classes?: { id: string; name: string } | null;
};

type Cls = { id: string; name: string };

export function StudentsExplorer({
  students,
  classes,
  isDirector,
}: {
  students: Student[];
  classes: Cls[];
  isDirector: boolean;
}) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter === "none" && s.class_id) return false;
      if (classFilter !== "all" && classFilter !== "none" && s.class_id !== classFilter)
        return false;
      if (!q) return true;
      return s.full_name.toLowerCase().includes(q);
    });
  }, [students, query, classFilter]);

  // Group by class for display.
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: Student[] }>();
    for (const s of filtered) {
      const key = s.class_id ?? "__none__";
      const name = s.classes?.name ?? "Sans classe";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(s);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) =>
      a.name.localeCompare(b.name),
    );
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un élève…"
          className="input pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <Pill active={classFilter === "all"} onClick={() => setClassFilter("all")}>
          Toutes
        </Pill>
        <Pill active={classFilter === "none"} onClick={() => setClassFilter("none")}>
          Sans classe
        </Pill>
        {classes.map((c) => (
          <Pill
            key={c.id}
            active={classFilter === c.id}
            onClick={() => setClassFilter(c.id)}
          >
            {c.name}
          </Pill>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          Aucun élève trouvé.
        </div>
      ) : (
        groups.map(([key, group]) => (
          <section key={key}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.name} · {group.items.length}
            </p>
            <ul className="card divide-y divide-slate-100">
              {group.items.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-3">
                  <Link
                    href={isDirector ? `/students/${s.id}` : "#"}
                    className="flex flex-1 items-center gap-3 min-w-0"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                      {initials(s.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {s.full_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {s.classes?.name ?? "Sans classe"}
                      </p>
                    </div>
                  </Link>
                  {isDirector ? (
                    <>
                      <ClassAssigner
                        studentId={s.id}
                        classId={s.class_id}
                        classes={classes}
                      />
                      <Link
                        href={`/students/${s.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400"
                        aria-label="Voir"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
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
          ? "bg-brand-600 text-white shadow-soft"
          : "bg-white border border-slate-200 text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
