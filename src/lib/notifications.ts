import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import type { FeatureKey } from "@/lib/features";

export interface NotifItem {
  id: string;
  feature: FeatureKey;
  title: string;
  body: string;
  timestamp: string;
}

export async function fetchNotifications(limit = 15): Promise<NotifItem[]> {
  const { profile } = await getSessionProfile();
  if (profile.role === "super_admin") return [];

  const supabase = createClient();

  const [hw, msg, pay, abs, sch, ex, rem] = await Promise.all([
    supabase
      .from("homework")
      .select("id, subject, title, created_at, classes(name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("messages")
      .select("id, subject, body, created_at, sender:profiles!messages_sender_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("payments")
      .select("id, description, amount, status, created_at, students(full_name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("absences")
      .select("id, date, reason, created_at, students(full_name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("schedules")
      .select("id, subject, day_of_week, created_at, classes(name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("exams")
      .select("id, subject, exam_date, created_at, classes(name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("remedials")
      .select("id, session_date, duration_minutes, reason, created_at, students(full_name)")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const out: NotifItem[] = [];

  (hw.data ?? []).forEach((h: any) => {
    out.push({
      id: `hw-${h.id}`,
      feature: "homework",
      title: `Nouveau devoir · ${h.subject}`,
      body: `${h.title}${h.classes?.name ? ` — ${h.classes.name}` : ""}`,
      timestamp: h.created_at,
    });
  });

  (msg.data ?? []).forEach((m: any) => {
    out.push({
      id: `msg-${m.id}`,
      feature: "messages",
      title: `Message · ${m.sender?.full_name ?? "Système"}`,
      body: m.subject,
      timestamp: m.created_at,
    });
  });

  (pay.data ?? []).forEach((p: any) => {
    out.push({
      id: `pay-${p.id}`,
      feature: "payments",
      title: p.status === "paid" ? "Paiement reçu" : "Nouveau paiement",
      body: `${p.description} — ${p.students?.full_name ?? ""}`,
      timestamp: p.created_at,
    });
  });

  (abs.data ?? []).forEach((a: any) => {
    out.push({
      id: `abs-${a.id}`,
      feature: "absences",
      title: "Absence enregistrée",
      body: `${a.students?.full_name ?? ""} — ${a.reason ?? "sans motif"}`,
      timestamp: a.created_at,
    });
  });

  (sch.data ?? []).forEach((s: any) => {
    out.push({
      id: `sch-${s.id}`,
      feature: "schedule",
      title: `Cours ajouté · ${s.subject}`,
      body: s.classes?.name ?? "",
      timestamp: s.created_at,
    });
  });

  (ex.data ?? []).forEach((e: any) => {
    out.push({
      id: `ex-${e.id}`,
      feature: "exams",
      title: `Examen · ${e.subject}`,
      body: `${e.classes?.name ?? ""}${e.exam_date ? ` — ${e.exam_date}` : ""}`,
      timestamp: e.created_at,
    });
  });

  (rem.data ?? []).forEach((r: any) => {
    out.push({
      id: `rem-${r.id}`,
      feature: "remedials",
      title: "Rattrapage programmé",
      body: `${r.students?.full_name ?? ""}${r.session_date ? ` — ${r.session_date}` : ""}`,
      timestamp: r.created_at,
    });
  });

  out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return out.slice(0, limit);
}
