import { Megaphone } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { st } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";
import { AnnouncementComposer } from "@/components/announcements/AnnouncementComposer";

export default async function AnnouncementsPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();
  const isDirector = profile.role === "director";

  // Defensive read: if migration_v12 hasn't been applied yet (PGRST205)
  // we render an empty list with a clear hint rather than crashing.
  let items: any[] = [];
  let schemaMissing = false;
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, created_by")
    .order("created_at", { ascending: false });
  if (error) {
    schemaMissing = (error as any).code === "PGRST205";
    if (!schemaMissing) {
      console.error("[announcements] select failed:", error.message);
    }
  } else {
    items = data ?? [];
  }

  // Resolve author names in one batch query (no embedded FK join).
  const authorById = new Map<string, string>();
  const authorIds = Array.from(
    new Set(items.map((a) => a.created_by).filter(Boolean)),
  );
  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    (authors ?? []).forEach((p: any) => authorById.set(p.id, p.full_name));
  }

  return (
    <div className="space-y-5">
      <Realtime tables={["announcements"]} />
      <TopBar
        subtitle={
          isDirector
            ? st("page.announcements.subtitle.director")
            : st("page.announcements.subtitle.user")
        }
        title={st("page.announcements.title")}
        icon={<Megaphone className="h-5 w-5" />}
        accent="from-fuchsia-500 to-fuchsia-700"
      />

      {isDirector && <AnnouncementComposer />}

      {schemaMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Migration manquante</p>
          <p className="mt-0.5 text-xs">
            Appliquez{" "}
            <code className="rounded bg-white/60 px-1 py-px text-[11px]">
              supabase/migration_v12.sql
            </code>{" "}
            dans Supabase pour activer les annonces.
          </p>
        </div>
      )}

      {!schemaMissing && items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <Megaphone className="h-6 w-6" />
          <p className="text-sm">{st("page.announcements.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 text-white shadow-soft">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {a.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {formatDate(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {a.body}
                  </p>
                  {a.created_by && authorById.get(a.created_by) && (
                    <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-400">
                      — {authorById.get(a.created_by)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
