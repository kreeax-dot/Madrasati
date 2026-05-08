export function TopBar({
  title,
  subtitle,
  /** Kept for backwards-compat with older callers; no longer used. */
  name: _name,
}: {
  title: string;
  subtitle?: string;
  name?: string;
}) {
  return (
    <header className="pt-2">
      {subtitle && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {subtitle}
        </p>
      )}
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
    </header>
  );
}
