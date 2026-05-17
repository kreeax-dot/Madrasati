import Link from "next/link";
import { MessagesSquare, ChevronRight, Inbox } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { st } from "@/lib/i18n/server";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { MessageComposer } from "@/components/messages/MessageComposer";

/**
 * Messages page: shows a list of CONVERSATIONS (grouped by partner) so a
 * user never sees their own outgoing messages as "received from
 * themselves". Click a conversation → /messages/[partnerId] for the
 * chat-style thread.
 */
export default async function MessagesPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  // Pull every message the current user can see (RLS already restricts
  // to: I'm sender OR I'm recipient OR I'm a director of the school).
  const { data: messagesRaw } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, subject, body, read_at, created_at")
    .order("created_at", { ascending: false });

  const all = (messagesRaw as any[]) ?? [];

  // Group by partner = the other end of each message.
  // Outgoing broadcasts (recipient_id null) are skipped from the
  // conversation list since there's no single partner to thread with.
  type Conv = {
    partnerId: string;
    lastMessage: any;
    unreadCount: number;
  };
  const byPartner = new Map<string, Conv>();
  for (const m of all) {
    let partnerId: string | null = null;
    if (m.sender_id === profile.id) partnerId = m.recipient_id ?? null;
    else if (m.recipient_id === profile.id) partnerId = m.sender_id ?? null;
    else continue; // director seeing school-wide messages they're not party to
    if (!partnerId) continue;
    const existing = byPartner.get(partnerId);
    const unreadInc = m.recipient_id === profile.id && !m.read_at ? 1 : 0;
    if (!existing) {
      byPartner.set(partnerId, {
        partnerId,
        lastMessage: m,
        unreadCount: unreadInc,
      });
    } else {
      existing.unreadCount += unreadInc;
      // messages are ordered DESC, so the first time we see a partner is
      // already the most recent — no need to overwrite lastMessage.
    }
  }

  const conversations = Array.from(byPartner.values()).sort((a, b) =>
    b.lastMessage.created_at.localeCompare(a.lastMessage.created_at),
  );

  // Resolve partner names in one batched query.
  const partnerById = new Map<string, string>();
  const partnerIds = conversations.map((c) => c.partnerId);
  if (partnerIds.length > 0) {
    const { data: partners } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", partnerIds);
    (partners ?? []).forEach((p: any) => partnerById.set(p.id, p.full_name));
  }

  const isDirector = profile.role === "director";

  // Director-only: prefetch class + student lists for the composer.
  let classes: { id: string; name: string }[] = [];
  let students: { id: string; full_name: string; class_id: string | null }[] = [];
  if (isDirector && profile.school_id) {
    let reader: any = supabase;
    if (hasServiceRoleKey()) {
      try {
        reader = createAdminClient();
      } catch {
        reader = supabase;
      }
    }
    const [clsRes, stRes] = await Promise.all([
      reader
        .from("classes")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("name"),
      reader
        .from("students")
        .select("id, full_name, class_id")
        .eq("school_id", profile.school_id)
        .order("full_name"),
    ]);
    classes = (clsRes.data as any[]) ?? [];
    students = (stRes.data as any[]) ?? [];
  }

  return (
    <div className="space-y-5">
      <Realtime tables={["messages"]} />
      <TopBar
        subtitle={
          isDirector
            ? st("page.messages.subtitle.director")
            : st("page.messages.subtitle.user")
        }
        title={st("page.messages.title")}
        icon={<MessagesSquare className="h-5 w-5" />}
        accent="from-blue-500 to-blue-700"
      />

      {isDirector && (
        <MessageComposer classes={classes} students={students} />
      )}

      {conversations.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <Inbox className="h-6 w-6" />
          <p className="text-sm">{st("msg.emptyConversations")}</p>
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {conversations.map((c) => {
            const partnerName =
              partnerById.get(c.partnerId) ?? "Utilisateur";
            const m = c.lastMessage;
            const youSent = m.sender_id === profile.id;
            return (
              <li key={c.partnerId}>
                <Link
                  href={`/messages/${c.partnerId}`}
                  className="flex items-start gap-3 p-4 active:bg-slate-50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-700">
                    {initials(partnerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          c.unreadCount > 0
                            ? "font-bold text-slate-900"
                            : "font-semibold text-slate-800"
                        }`}
                      >
                        {partnerName}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {timeAgo(m.created_at)}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-xs ${
                        c.unreadCount > 0
                          ? "font-medium text-slate-800"
                          : "text-slate-500"
                      }`}
                    >
                      {youSent ? st("msg.yousent") : ""}
                      {m.subject ?? m.body}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {m.body}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="mt-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </span>
                  )}
                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
