import type { ReactNode } from "react";

/**
 * Unified page header used across every (app)/* route.
 *
 *   <TopBar
 *     title="Élèves"
 *     subtitle="42 élèves"
 *     icon={<Users />}
 *     accent="from-emerald-500 to-emerald-700"
 *   />
 *
 * When `icon` + `accent` are provided, renders a small gradient square next
 * to the title so each module is visually identifiable at a glance —
 * matching the design language of the dashboard tiles.
 */
export function TopBar({
  title,
  subtitle,
  icon,
  accent,
  /** Kept for backwards-compat with older callers; no longer used. */
  name: _name,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Tailwind gradient classes, e.g. "from-emerald-500 to-emerald-700". */
  accent?: string;
  name?: string;
}) {
  return (
    <header className="flex items-center gap-3 pt-1">
      {icon && (
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
            accent ?? "from-brand-500 to-brand-700"
          } text-white shadow-tile`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        {subtitle && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {subtitle}
          </p>
        )}
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>
      </div>
    </header>
  );
}
