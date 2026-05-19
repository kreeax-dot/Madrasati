import { UtensilsCrossed } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { st } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { CanteenEditor } from "@/components/director/CanteenEditor";
import { Realtime } from "@/components/Realtime";

// Day names are looked up via the dictionary so the canteen page renders
// in the active locale (FR or AR).
const DAY_KEYS = ["day.0", "day.1", "day.2", "day.3", "day.4", "day.5", "day.6"] as const;

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function CanteenPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const monday = mondayOf(new Date());
  const weekStart = monday.toISOString().slice(0, 10);

  const { data: menus } = await supabase
    .from("canteen_menus")
    .select("*")
    .eq("week_start", weekStart)
    .order("day_of_week");

  const byDay = new Map<number, any>();
  (menus ?? []).forEach((m: any) => byDay.set(m.day_of_week, m));

  if (profile.role === "director") {
    return (
      <div className="space-y-5">
        <Realtime tables={["canteen_menus"]} />
        <TopBar
        subtitle={st("page.canteen.subtitle")}
        title={st("page.canteen.title")}
        icon={<UtensilsCrossed className="h-5 w-5" />}
        accent="from-amber-500 to-amber-700"
      />
        <CanteenEditor weekStart={weekStart} initial={(menus as any[]) ?? []} />
      </div>
    );
  }

  // Parent / student
  const todayIdx = new Date().getDay();
  const days = [1, 2, 3, 4, 5]; // Lundi → Vendredi by default

  return (
    <div className="space-y-5">
      <Realtime tables={["canteen_menus"]} />
      <TopBar
        subtitle={st("page.canteen.subtitle")}
        title={st("page.canteen.title")}
        icon={<UtensilsCrossed className="h-5 w-5" />}
        accent="from-amber-500 to-amber-700"
      />
      {menus?.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-12 text-slate-400">
          <UtensilsCrossed className="h-7 w-7" />
          <p className="text-sm">{st("page.canteen.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {days.map((d) => {
            const m = byDay.get(d);
            const isToday = d === todayIdx;
            return (
              <li
                key={d}
                className={`card p-4 ${isToday ? "ring-2 ring-amber-200" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    {st(DAY_KEYS[d])}{" "}
                    {isToday && `· ${st("day.today")}`}
                  </p>
                  <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                </div>
                {m ? (
                  <div className="mt-3 space-y-1.5 text-sm">
                    {m.starter && (
                      <Row label={st("canteen.starter")} value={m.starter} />
                    )}
                    {m.main && <Row label={st("canteen.main")} value={m.main} />}
                    {m.dessert && (
                      <Row label={st("canteen.dessert")} value={m.dessert} />
                    )}
                    {m.notes && (
                      <p className="mt-2 text-xs text-slate-500">{m.notes}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">—</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}
