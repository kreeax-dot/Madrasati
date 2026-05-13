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

/**
 * Fetches a unified notification feed scoped to the current user via RLS.
 *
 * IMPORTANT: this function is rendered by the AppHeader on EVERY authenticated
 * page. It MUST NOT throw, or the entire (app)/* layout dies with
 * "An error occurred in server components render".
 *
 * Strategy:
 *   1. Each per-table fetch is wrapped in `safe()` → empty array on any error.
 *   2. We use `Promise.allSettled` so one failing query never poisons the rest.
 *   3. Embedded joins are kept minimal; sender names are resolved with a
 *      single follow-up batch query, so we don't depend on a specific FK name
 *      that might mismatch across schema versions.
 */
export async function fetchNotifications(limit = 20): Promise<NotifItem[]> {
  try {
    const { profile } = await getSessionProfile();
    if (profile.role === "super_admin") return [];

    const supabase = createClient();

    const settled = await Promise.allSettled([
      safe(() =>
        supabase
          .from("homework")
          .select("id, subject, title, created_at, classes(name)")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("messages")
          .select("id, sender_id, subject, body, created_at")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("payments")
          .select("id, description, amount, status, created_at, students(full_name)")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("absences")
          .select("id, date, reason, created_at, students(full_name)")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("schedules")
          .select("id, subject, day_of_week, created_at, classes(name)")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("exams")
          .select("id, subject, exam_date, created_at, classes(name)")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("remedials")
          .select("id, session_date, duration_minutes, reason, created_at, students(full_name)")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
    ]);

    const [hw, msg, pay, abs, sch, ex, rem] = settled.map((r) =>
      r.status === "fulfilled" ? r.value : [],
    );

    // Resolve sender names in one batch query — survives any FK rename.
    const senderIds = Array.from(
      new Set((msg as any[]).map((m: any) => m.sender_id).filter(Boolean)),
    );
    let senderName = new Map<string, string>();
    if (senderIds.length > 0) {
      try {
        const { data: senders } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);
        (senders ?? []).forEach((s: any) => senderName.set(s.id, s.full_name));
      } catch {
        /* leave senderName empty — fallback to "Système" below */
      }
    }

    const out: NotifItem[] = [];

    (hw as any[]).forEach((h) => {
      out.push({
        id: `hw-${h.id}`,
        feature: "homework",
        title: `Nouveau devoir · ${h.subject}`,
        body: `${h.title}${h.classes?.name ? ` — ${h.classes.name}` : ""}`,
        timestamp: h.created_at,
      });
    });

    (msg as any[]).forEach((m) => {
      out.push({
        id: `msg-${m.id}`,
        feature: "messages",
        title: `Message · ${senderName.get(m.sender_id) ?? "Système"}`,
        body: m.subject ?? "",
        timestamp: m.created_at,
      });
    });

    (pay as any[]).forEach((p) => {
      out.push({
        id: `pay-${p.id}`,
        feature: "payments",
        title: p.status === "paid" ? "Paiement reçu" : "Nouveau paiement",
        body: `${p.description ?? ""}${p.students?.full_name ? ` — ${p.students.full_name}` : ""}`,
        timestamp: p.created_at,
      });
    });

    (abs as any[]).forEach((a) => {
      out.push({
        id: `abs-${a.id}`,
        feature: "absences",
        title: "Absence enregistrée",
        body: `${a.students?.full_name ?? ""} — ${a.reason ?? "sans motif"}`,
        timestamp: a.created_at,
      });
    });

    (sch as any[]).forEach((s) => {
      out.push({
        id: `sch-${s.id}`,
        feature: "schedule",
        title: `Cours ajouté · ${s.subject}`,
        body: s.classes?.name ?? "",
        timestamp: s.created_at,
      });
    });

    (ex as any[]).forEach((e) => {
      out.push({
        id: `ex-${e.id}`,
        feature: "exams",
        title: `Examen · ${e.subject}`,
        body: `${e.classes?.name ?? ""}${e.exam_date ? ` — ${e.exam_date}` : ""}`,
        timestamp: e.created_at,
      });
    });

    (rem as any[]).forEach((r) => {
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
  } catch (err) {
    // Last-resort guard — log to server console (visible in Vercel logs) but
    // never propagate, so the layout doesn't blow up.
    console.error("[fetchNotifications] swallowed error:", err);
    return [];
  }
}

async function safe<T>(fn: () => PromiseLike<{ data: T | null; error: any }>): Promise<T[]> {
  try {
    const { data, error } = await fn();
    if (error) return [];
    return (data as unknown as T[]) ?? [];
  } catch {
    return [];
  }
}
