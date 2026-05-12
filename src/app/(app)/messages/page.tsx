import { Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Realtime } from "@/components/Realtime";
import { formatDate, initials } from "@/lib/utils";

export default async function MessagesPage() {
  // Defense-in-depth: super_admin is already redirected by (app)/layout, but
  // we still gate the page explicitly so accidental cross-role navigation
  // can't leak data even if the layout guard regresses.
  await requireRole(["director", "parent", "student"]);

  const supabase = createClient();
  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, subject, body, read_at, created_at, sender:profiles!messages_sender_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <Realtime tables={["messages"]} />
      <TopBar subtitle="Boîte de réception" title="Messages" />

      <button className="btn-primary w-full" disabled>
        <Plus className="h-4 w-4" />
        Nouveau message
      </button>

      <ul className="card divide-y divide-slate-100">
        {(messages ?? []).length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-400">
            Aucun message pour le moment.
          </li>
        ) : (
          messages!.map((m: any) => {
            const senderName = m.sender?.full_name ?? "Système";
            const isUnread = !m.read_at;
            return (
              <li key={m.id} className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-semibold text-blue-700">
                  {initials(senderName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        isUnread
                          ? "font-semibold text-slate-900"
                          : "text-slate-700"
                      }`}
                    >
                      {senderName}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(m.created_at)}
                    </span>
                  </div>
                  <p
                    className={`truncate text-sm ${
                      isUnread
                        ? "font-medium text-slate-800"
                        : "text-slate-600"
                    }`}
                  >
                    {m.subject}
                  </p>
                  <p className="truncate text-xs text-slate-500">{m.body}</p>
                </div>
                {isUnread && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
