import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { HomeworkEditor } from "@/components/director/HomeworkEditor";
import { Realtime } from "@/components/Realtime";

export default async function HomeworkPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const [{ data: classes }, { data: homework }] = await Promise.all([
    supabase.from("classes").select("id, name").order("name"),
    supabase
      .from("homework")
      .select("id, class_id, subject, title, description, due_date, classes(name)")
      .order("due_date", { ascending: true }),
  ]);

  if (profile.role === "director") {
    return (
      <div className="space-y-5">
        <TopBar subtitle="Devoirs" title="Devoirs à donner" />
        <HomeworkEditor
          classes={(classes as any[]) ?? []}
          homework={(homework as any[]) ?? []}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Realtime tables={["homework"]} />
      <TopBar subtitle="Devoirs" title="À faire" />
      {(homework ?? []).length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          Aucun devoir pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {homework!.map((h: any) => {
            const due = new Date(h.due_date);
            const isPast = due < new Date(new Date().toDateString());
            return (
              <li key={h.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                      {h.subject}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {h.title}
                    </p>
                    {h.description && (
                      <p className="mt-1 text-sm text-slate-600">{h.description}</p>
                    )}
                  </div>
                  <span className={isPast ? "badge-red" : "badge-blue"}>
                    {formatDate(h.due_date)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
