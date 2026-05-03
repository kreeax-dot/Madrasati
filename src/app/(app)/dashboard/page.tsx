import Link from "next/link";
import {
  Users,
  Wallet,
  MessagesSquare,
  ChevronRight,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Realtime } from "@/components/Realtime";

export default async function DashboardPage() {
  const { profile } = await getSessionProfile();
  const supabase = createClient();

  const fullName = profile.full_name ?? "Utilisateur";
  const isDirector = profile.role === "director";
  const isStudent = profile.role === "student";

  const studentsQ = isDirector
    ? supabase.from("students").select("id", { count: "exact", head: true })
    : isStudent && profile.student_id
      ? supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("id", profile.student_id)
      : supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", profile.id);

  const counters = await Promise.all([
    studentsQ,
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  const studentsCount = counters[0].count ?? 0;
  const pendingPayments = counters[1].count ?? 0;
  const unread = counters[2].count ?? 0;

  const { data: recentPayments } = await supabase
    .from("payments")
    .select("id, amount, status, due_date, description, students(full_name)")
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="space-y-6">
      <Realtime tables={["payments", "messages", "homework"]} />
      <TopBar
        subtitle={
          profile.role === "director"
            ? "Directeur"
            : profile.role === "student"
              ? "Élève"
              : "Bonjour"
        }
        title={fullName.split(" ")[0]}
        name={fullName}
      />

      <section className="card border-0 bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          Aperçu rapide
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat
            label={isDirector ? "Élèves" : isStudent ? "Profil" : "Enfants"}
            value={studentsCount}
          />
          <Stat label="Impayés" value={pendingPayments} />
          <Stat label="Messages" value={unread} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Accès rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          {isDirector ? (
            <>
              <QuickLink href="/classes" icon={<GraduationCap className="h-5 w-5" />} label="Classes" />
              <QuickLink href="/students" icon={<Users className="h-5 w-5" />} label="Élèves" />
              <QuickLink href="/schedule" icon={<CalendarRange className="h-5 w-5" />} label="Horaires" />
              <QuickLink href="/homework" icon={<BookOpen className="h-5 w-5" />} label="Devoirs" />
              <QuickLink href="/absences" icon={<ClipboardList className="h-5 w-5" />} label="Absences" />
              <QuickLink href="/payments" icon={<Wallet className="h-5 w-5" />} label="Paiements" />
            </>
          ) : (
            <>
              <QuickLink href="/schedule" icon={<CalendarRange className="h-5 w-5" />} label="Horaires" />
              <QuickLink href="/homework" icon={<BookOpen className="h-5 w-5" />} label="Devoirs" />
              <QuickLink href="/absences" icon={<ClipboardList className="h-5 w-5" />} label="Absences" />
              <QuickLink href="/payments" icon={<Wallet className="h-5 w-5" />} label="Paiements" />
              <QuickLink href="/messages" icon={<MessagesSquare className="h-5 w-5" />} label="Messages" />
            </>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Derniers paiements</h2>
          <Link href="/payments" className="text-xs font-medium text-brand-600">
            Voir tout
          </Link>
        </div>
        <div className="card divide-y divide-slate-100">
          {(recentPayments ?? []).length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              Aucun paiement pour le moment.
            </div>
          ) : (
            recentPayments!.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {p.description}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {p.students?.full_name ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(p.amount)}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-3">
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card flex items-center justify-between p-4 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge-green">Payé</span>;
  if (status === "overdue") return <span className="badge-red">En retard</span>;
  return <span className="badge-amber">En attente</span>;
}
