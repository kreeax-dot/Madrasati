import { Bell } from "lucide-react";
import { initials } from "@/lib/utils";

export function TopBar({
  title,
  subtitle,
  name,
}: {
  title: string;
  subtitle?: string;
  name?: string;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-2">
      <div className="min-w-0">
        {subtitle && (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {subtitle}
          </p>
        )}
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 truncate">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-500" />
        </button>
        {name && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white">
            {initials(name)}
          </div>
        )}
      </div>
    </header>
  );
}
