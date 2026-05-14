import Link from "next/link";
import { Users, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { features, type FeatureKey } from "@/lib/features";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { Realtime } from "@/components/Realtime";
import { MigrationBanner } from "@/components/director/MigrationBanner";

export default async function DashboardPage() {
  const { profile } = await getSessionProfile();
  const supabase = createClient();
  const school = await getCurrentSchool();

  const isDirector = profile.role === "director";
  const isStudent = profile.role === "student";

  // For director counters: admin client if available, user client otherwise.
  let reader: any = supabase;
  if (isDirector && profile.school_id && hasServiceRoleKey()) {
    try {
      reader = createAdminClient();
    } catch {
      reader = supabase;
    }
  }

  // Counters (role-aware students count).
  const studentsQ = isDirector
    ? (profile.school_id
        ? reader.from("students").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id)
        : reader.from("students").select("id", { count: "exact", head: true }))
    : isStudent && profile.student_id
      ? supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("id", profile.student_id)
      : supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", profile.id);

  const paymentsQ = isDirector && profile.school_id
    ? reader.from("payments").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id).neq("status", "paid")
    : supabase.from("payments").select("id", { count: "exact", head: true }).neq("status", "paid");

  const [
    { count: studentsCount },
    { count: pendingPayments },
    { count: unread },
    { data: nextHomework },
    { data: recentPayments },
  ] = await Promise.all([
    studentsQ,
    paymentsQ,
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
    supabase
      .from("homework")
      .select("id, subject, title, due_date, class_id")
      .gte("due_date", new Date().toISOString().slice(0, 10))
      .order("due_date")
      .limit(2),
    supabase
      .from("payments")
      .select("id, amount, status, due_date, description, student_id")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  // Resolve class names + student names separately to avoid embedded-join
  // FK ambiguity (the previous syntax silently returned nulls on some
  // schema variants).
  const hwList = ((nextHomework as any[]) ?? []) as any[];
  const payList = ((recentPayments as any[]) ?? []) as any[];
  const classIds = Array.from(
    new Set(hwList.map((h) => h.class_id).filter(Boolean)),
  );
  const studentIds = Array.from(
    new Set(payList.map((p) => p.student_id).filter(Boolean)),
  );
  const [classNamesRes, studentNamesRes] = await Promise.all([
    classIds.length > 0
      ? supabase.from("classes").select("id, name").in("id", classIds)
      : Promise.resolve({ data: [] as any[] }),
    studentIds.length > 0
      ? supabase
          .from("students")
          .select("id, full_name")
          .in("id", studentIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const classNameById = new Map<string, string>(
    ((classNamesRes as any).data ?? []).map((c: any) => [c.id, c.name]),
  );
  const studentNameById = new Map<string, string>(
    ((studentNamesRes as any).data ?? []).map((s: any) => [s.id, s.full_name]),
  );
  hwList.forEach((h) => {
    h.classes = h.class_id ? { name: classNameById.get(h.class_id) ?? "" } : null;
  });
  payList.forEach((p) => {
    p.students = p.student_id
      ? { full_name: studentNameById.get(p.student_id) ?? "—" }
      : null;
  });

  const enabled = (school?.features ?? {
    payments: true,
    messages: true,
    absences: true,
    schedule: true,
  }) as unknown as Record<string, boolean>;

  const directorTiles: FeatureKey[] = [
    "schedule",
    "homework",
    "exams",
    "remedials",
    "photos",
    "absences",
    "payments",
    "canteen",
    "messages",
  ];
  const userTiles: FeatureKey[] = [
    "schedule",
    "homework",
    "exams",
    "remedials",
    "photos",
    "canteen",
    "absences",
    "payments",
    "messages",
  ];
  const alwaysOn = new Set<FeatureKey>([
    "homework",
    "canteen",
    "exams",
    "remedials",
    "photos",
  ]);
  const tiles = (isDirector ? directorTiles : userTiles).filter(
    (k) => enabled[k] !== false || alwaysOn.has(k),
  );

  // Fetch student avatar for student dashboard.
  let studentAvatar: { url: string | null; name: string } | null = null;
  if (isStudent && profile.student_id) {
    const { data: me } = await supabase
      .from("students")
      .select("avatar_url, full_name")
      .eq("id", profile.student_id)
      .maybeSingle();
    if (me) {
      studentAvatar = {
        url: (me as any).avatar_url ?? null,
        name: (me as any).full_name ?? profile.full_name,
      };
    }
  }

  return (
    <div className="space-y-6">
      <Realtime tables={["payments", "messages", "homework", "absences", "schedules", "canteen_menus", "exams", "remedials", "photos"]} />

      {isDirector && <MigrationBanner />}

      {/* Hero "Hello" card — full-width gradient block inspired by the
          design mockups (Hello Anastasia / soft search bar). */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-5 text-white shadow-tile animate-slide-up">
        {/* Decorative blobs */}
        <span
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-6 -right-3 h-20 w-20 rounded-full bg-white/10"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          {studentAvatar && (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/40 shadow-soft">
              {studentAvatar.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={studentAvatar.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/20 text-base font-bold text-white">
                  {initials(studentAvatar.name)}
                </div>
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">
              Bonjour
            </p>
            <h1 className="mt-0.5 text-2xl font-bold leading-tight tracking-tight truncate">
              {(studentAvatar?.name ?? profile.full_name).split(" ")[0]}
            </h1>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-3">
          <Stat
            icon={<Users className="h-3.5 w-3.5 text-white/70" />}
            label={isDirector ? "Élèves" : isStudent ? "Profil" : "Enfants"}
            value={studentsCount ?? 0}
          />
          <Stat
            icon={<GraduationCap className="h-3.5 w-3.5 text-white/70" />}
            label="Impayés"
            value={pendingPayments ?? 0}
          />
          <Stat
            icon={<GraduationCap className="h-3.5 w-3.5 text-white/70" />}
            label="Messages"
            value={unread ?? 0}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-bold text-slate-900">Mes accès</h2>
          <span className="text-xs font-medium text-slate-400">
            {tiles.length} modules
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((k) => (
            <FeatureTile key={k} feature={k} />
          ))}
        </div>
      </section>

      {!isDirector && hwList.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Prochains devoirs</h2>
            <Link href="/homework" className="text-xs font-medium text-brand-600">
              Voir tout
            </Link>
          </div>
          <ul className="space-y-2">
            {hwList.map((h: any) => (
              <li key={h.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                      {h.subject}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                      {h.title}
                    </p>
                  </div>
                  <span className="badge-blue shrink-0">{formatDate(h.due_date)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {payList.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Derniers paiements</h2>
            <Link href="/payments" className="text-xs font-medium text-brand-600">
              Voir tout
            </Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {payList.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {p.description}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {p.students?.full_name ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(Number(p.amount))}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-3 backdrop-blur-sm ring-1 ring-white/10">
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/80">
        {icon}
        {label}
      </p>
    </div>
  );
}

function FeatureTile({ feature }: { feature: FeatureKey }) {
  const f = features[feature];
  const Icon = f.icon;
  return (
    <Link
      href={f.href}
      className={`relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${f.gradient} p-3.5 text-white shadow-tile transition active:scale-[0.97]`}
    >
      {/* Decorative blob — abstract organic shape echoing the design mockups. */}
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-4 -left-3 h-14 w-14 rounded-full bg-black/10"
        aria-hidden
      />
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
          Madrasati
        </p>
        <p className="mt-0.5 text-sm font-bold leading-tight">{f.label}</p>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge-green">Payé</span>;
  if (status === "overdue") return <span className="badge-red">En retard</span>;
  return <span className="badge-amber">En attente</span>;
}
