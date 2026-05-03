export default function AppLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pt-2">
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
          <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
