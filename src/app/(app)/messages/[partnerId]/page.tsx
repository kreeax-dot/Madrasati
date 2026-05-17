import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { Realtime } from "@/components/Realtime";
import { ThreadComposer } from "@/components/messages/ThreadComposer";
import { markMessageRead } from "@/app/actions/director";
import { st } from "@/lib/i18n/server";

export default async function MessageThreadPage({
  params,
}: {
  params: { partnerId: string };
}) {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const { data: partner } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, school_id")
    .eq("id", params.partnerId)
    .maybeSingle();
  if (!partner) notFound();
  if (profile.school_id && (partner as any).school_id !== profile.school_id) {
    notFound();
  }

  // Fetch all messages between current user and partner (both directions).
  const { data: messagesRaw } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, subject, body, read_at, created_at")
    .or(
      `and(sender_id.eq.${profile.id},recipient_id.eq.${params.partnerId}),and(sender_id.eq.${params.partnerId},recipient_id.eq.${profile.id})`,
    )
    .order("created_at", { ascending: true });

  const messages = (messagesRaw as any[]) ?? [];

  // Server-side fire-and-forget: mark every unread message received from
  // this partner as read. We don't await across the whole list (small N).
  const unreadIds = messages
    .filter((m) => m.sender_id === params.partnerId && !m.read_at)
    .map((m) => m.id);
  if (unreadIds.length > 0) {
    // Each call is itself fire-and-forget — failures are logged inside the
    // action and don't break the page render.
    Promise.allSettled(unreadIds.map((id) => markMessageRead(id))).catch(
      () => undefined,
    );
  }

  const partnerName = (partner as any).full_name as string;

  return (
    <div className="flex h-[calc(100dvh-72px)] flex-col">
      <Realtime tables={["messages"]} />

      <header className="flex items-center gap-3 pb-3">
        <Link
          href="/messages"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
          aria-label={st("generic.return")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">
          {initials(partnerName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900">
            {partnerName}
          </p>
          <p className="truncate text-[11px] uppercase tracking-wider text-slate-400">
            {(partner as any).role}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
            {st("msg.threadEmpty")}
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === profile.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    mine
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {m.body}
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3">
        <ThreadComposer partnerId={params.partnerId} />
      </div>
    </div>
  );
}
