import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import type { FeatureKey } from "@/lib/features";

export interface NotifItem {
  id: string;
  feature: FeatureKey;
  title: string;
  body: string;
  timestamp: string;
  /** Where clicking this notification should navigate. */
  href: string;
}

/**
 * Fetches a unified notification feed for the current user.
 *
 * Rules:
 *   - Items the current user CREATED are filtered out (no "you got
 *     notified about your own action" noise). For messages: skip rows
 *     where I'm the sender. For homework/exams/remedials: skip rows
 *     where created_by = me.
 *   - Each per-table fetch is wrapped in `safe()` → empty array on
 *     any error so a missing table can never crash AppHeader.
 *   - Promise.allSettled isolates failures further.
 *   - Top-level try/catch is the last-resort guard.
 *
 * This function is rendered on EVERY authenticated page (AppHeader), so
 * it MUST NEVER throw.
 */
export async function fetchNotifications(limit = 30): Promise<NotifItem[]> {
  try {
    const { profile } = await getSessionProfile();
    if (profile.role === "super_admin") return [];

    const supabase = createClient();
    const meId = profile.id;

    const settled = await Promise.allSettled([
      safe(() =>
        supabase
          .from("homework")
          .select("id, subject, title, created_at, created_by, class_id")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        // Notifications only for messages I RECEIVED, not sent.
        supabase
          .from("messages")
          .select("id, sender_id, recipient_id, subject, body, created_at")
          .eq("recipient_id", meId)
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("payments")
          .select("id, description, amount, status, created_at, student_id")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("absences")
          .select("id, date, reason, created_at, student_id")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("schedules")
          .select("id, subject, day_of_week, created_at, class_id")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("exams")
          .select("id, subject, exam_date, created_at, created_by, class_id")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("remedials")
          .select(
            "id, session_date, duration_minutes, reason, created_at, created_by, student_id",
          )
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
      safe(() =>
        supabase
          .from("announcements")
          .select("id, title, body, created_at, created_by")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
    ]);

    const [hw, msg, pay, abs, sch, ex, rem, ann] = settled.map((r) =>
      r.status === "fulfilled" ? r.value : [],
    );

    // Resolve sender names for received messages.
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
        /* fallback to "Système" below */
      }
    }

    const out: NotifItem[] = [];

    (hw as any[]).forEach((h) => {
      if (h.created_by === meId) return; // skip my own
      out.push({
        id: `hw-${h.id}`,
        feature: "homework",
        title: `Nouveau devoir · ${h.subject}`,
        body: `${h.title}`,
        timestamp: h.created_at,
        href: "/homework",
      });
    });

    (msg as any[]).forEach((m) => {
      out.push({
        id: `msg-${m.id}`,
        feature: "messages",
        title: `Message · ${senderName.get(m.sender_id) ?? "Système"}`,
        body: m.subject ?? m.body ?? "",
        timestamp: m.created_at,
        href: m.sender_id ? `/messages/${m.sender_id}` : "/messages",
      });
    });

    (pay as any[]).forEach((p) => {
      out.push({
        id: `pay-${p.id}`,
        feature: "payments",
        title: p.status === "paid" ? "Paiement reçu" : "Nouveau paiement",
        body: `${p.description ?? ""}`,
        timestamp: p.created_at,
        href: "/payments",
      });
    });

    (abs as any[]).forEach((a) => {
      out.push({
        id: `abs-${a.id}`,
        feature: "absences",
        title: "Absence enregistrée",
        body: `${a.reason ?? "sans motif"}`,
        timestamp: a.created_at,
        href: "/absences",
      });
    });

    (sch as any[]).forEach((s) => {
      out.push({
        id: `sch-${s.id}`,
        feature: "schedule",
        title: `Cours ajouté · ${s.subject}`,
        body: "",
        timestamp: s.created_at,
        href: "/schedule",
      });
    });

    (ex as any[]).forEach((e) => {
      if (e.created_by === meId) return; // skip my own
      out.push({
        id: `ex-${e.id}`,
        feature: "exams",
        title: `Examen · ${e.subject}`,
        body: `${e.exam_date ?? ""}`,
        timestamp: e.created_at,
        href: "/exams",
      });
    });

    (rem as any[]).forEach((r) => {
      if (r.created_by === meId) return; // skip my own
      out.push({
        id: `rem-${r.id}`,
        feature: "remedials",
        title: "Rattrapage programmé",
        body: `${r.reason ?? ""}${r.session_date ? ` — ${r.session_date}` : ""}`,
        timestamp: r.created_at,
        href: "/remedials",
      });
    });

    (ann as any[]).forEach((a) => {
      if (a.created_by === meId) return; // director skips own announcement
      out.push({
        id: `ann-${a.id}`,
        feature: "announcements",
        title: `Annonce · ${a.title}`,
        body: a.body ?? "",
        timestamp: a.created_at,
        href: "/announcements",
      });
    });

    out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return out.slice(0, limit);
  } catch (err) {
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
