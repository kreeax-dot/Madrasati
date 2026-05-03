import Link from "next/link";
import { Users, Wallet, MessagesSquare, ChevronRight, CalendarRange, BookOpen } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, school_id")
    .eq("id", user!.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? user?.email ?? "Utilisateur";

  const [{ count: studentsCount }, { count: pendingPayments }, { count: unread }] =
    await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
    ]);

  const { data: recentPayments } = await supabase
    .from("payments")
    .select("id, amount, status, due_date, description, students(full_name)")
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="space-y-6">
      <TopBar subtitle="Bonjour" title={fullName.split(" ")[0]} name={fullName} />

      <section className="card p-5 bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          Aperçu rapide
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Élèves" value={studentsCount ?? 0} />
          <Stat label="Impayés" value={pendingPayments ?? 0} />
          <Stat label="Messages" value={unread ?? 0} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Accès rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink href="/students" icon={<Users className="h-5 w-5" />} label="Élèves" />
          <QuickLink href="/payments" icon={<Wallet className="h-5 w-5" />} label="Paiements" />
          <QuickLink href="/messages" icon={<MessagesSquare className="h-5 w-5" />} label="Messages" />
          <QuickLink href="#" icon={<CalendarRange className="h-5 w-5" />} label="Emploi du temps" disabled />
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
            <EmptyHint icon={<BookOpen className="h-5 w-5" />} text="Aucun paiement pour le moment." />
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
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  const Comp: any = disabled ? "div" : Link;
  return (
    <Comp
      href={disabled ? undefined : href}
      className={`card flex items-center justify-between p-4 ${
        disabled ? "opacity-50" : "active:scale-[0.98]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </Comp>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge-green">Payé</span>;
  if (status === "overdue") return <span className="badge-red">En retard</span>;
  return <span className="badge-amber">En attente</span>;
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
