"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Inbox } from "lucide-react";
import { initials } from "@/lib/utils";
import { markMessageRead } from "@/app/actions/director";

type Msg = {
  id: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender?: { full_name: string } | null;
};

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

export function MessagesInbox({ messages }: { messages: Msg[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [optimisticRead, setOptimisticRead] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function expand(m: Msg) {
    setOpen((cur) => (cur === m.id ? null : m.id));
    if (!m.read_at && !optimisticRead.has(m.id)) {
      setOptimisticRead((s) => new Set(s).add(m.id));
      startTransition(async () => {
        try {
          await markMessageRead(m.id);
        } catch {
          /* non-fatal */
        }
      });
    }
  }

  if (messages.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
        <Inbox className="h-6 w-6" />
        <p className="text-sm">Aucun message pour le moment.</p>
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-slate-100">
      {messages.map((m) => {
        const senderName = m.sender?.full_name ?? "Système";
        const isUnread = !m.read_at && !optimisticRead.has(m.id);
        const isOpen = open === m.id;
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => expand(m)}
              className="flex w-full items-start gap-3 p-4 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-semibold text-brand-700">
                {initials(senderName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={`truncate text-sm ${
                      isUnread ? "font-semibold text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {senderName}
                  </p>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {timeAgo(m.created_at)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 truncate text-sm ${
                    isUnread
                      ? "font-medium text-slate-800"
                      : "text-slate-600"
                  }`}
                >
                  {m.subject}
                </p>
                {!isOpen && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {m.body}
                  </p>
                )}
              </div>
              {isUnread && (
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              )}
              <ChevronRight
                className={`mt-1 h-4 w-4 shrink-0 text-slate-300 transition ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-700 whitespace-pre-wrap">
                {m.body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
