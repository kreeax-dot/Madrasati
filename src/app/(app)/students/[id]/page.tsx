import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Repeat, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StudentQuickActions } from "@/components/director/StudentQuickActions";
import { StudentAvatarEditor } from "@/components/director/StudentAvatarEditor";

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["director"]);
  const supabase = createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, class_id, date_of_birth, avatar_url")
    .eq("id", params.id)
    .maybeSingle();
  if (!student) notFound();

  let className: string | null = null;
  if ((student as any).class_id) {
    const { data: cls } = await supabase
      .from("classes")
      .select("name")
      .eq("id", (student as any).class_id)
      .maybeSingle();
    className = (cls as any)?.name ?? null;
  }
  (student as any).classes = className ? { name: className } : null;

  const [
    { data: payments },
    { data: absences },
    { data: code },
    { data: remedials },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, status, due_date, description")
      .eq("student_id", params.id)
      .order("due_date", { ascending: false }),
    supabase
      .from("absences")
      .select("id, date, reason, justified")
      .eq("student_id", params.id)
      .order("date", { ascending: false }),
    supabase
      .from("student_codes")
      .select("code, used_at")
      .eq("student_id", params.id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("remedials")
      .select("id, session_date, duration_minutes, reason")
      .eq("student_id", params.id)
      .order("session_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/students"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <header className="space-y-3">
        <StudentAvatarEditor
          studentId={student.id}
          fullName={student.full_name}
          avatarUrl={(student as any).avatar_url ?? null}
        />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Élève
          </p>
          <h1 className="text-xl font-bold tracking-tight truncate">
            {student.full_name}
          </h1>
          <p className="text-xs text-slate-500">
            {(student as any).classes?.name ?? "Sans classe"}
            {student.date_of_birth ? ` · ${formatDate(student.date_of_birth)}` : ""}
          </p>
        </div>
      </header>

      <StudentQuickActions
        studentId={student.id}
        currentCode={code?.code ?? null}
      />

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Paiements</h2>
        </div>
        {(payments ?? []).length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            Aucun paiement.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {payments!.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {p.description}
                  </p>
                  <p className="text-xs text-slate-500">
                    Échéance {formatDate(p.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Absences</h2>
        </div>
        {(absences ?? []).length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            Aucune absence.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {absences!.map((a) => (
              <li key={a.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(a.date)}
                  </p>
                  <p className="text-xs text-slate-500">{a.reason ?? "Sans motif"}</p>
                </div>
                {a.justified ? (
                  <span className="badge-green">Justifiée</span>
                ) : (
                  <span className="badge-amber">Non justifiée</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Repeat className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Rattrapages</h2>
        </div>
        {(remedials ?? []).length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            Aucun rattrapage.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {remedials!.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {r.reason ?? "Rattrapage"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(r.session_date)}
                  </p>
                </div>
                <span className="badge-blue shrink-0">
                  {formatDuration(r.duration_minutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge-green">Payé</span>;
  if (status === "overdue") return <span className="badge-red">En retard</span>;
  return <span className="badge-amber">En attente</span>;
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
  }
  return `${minutes} min`;
}
