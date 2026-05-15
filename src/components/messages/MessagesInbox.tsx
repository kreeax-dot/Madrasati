"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Inbox,
  Loader2,
  Reply,
  Send,
} from "lucide-react";
import { initials } from "@/lib/utils";
import { markMessageRead, sendReply } from "@/app/actions/director";

type Msg = {
  id: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender?: { full_name: string } | null;
  /**
   * True iff the current user can reply to this message — i.e. they are
   * the recipient, not the sender. The page is responsible for passing
   * this flag (only set for messages where recipient_id === current user).
   */
  canReply?: boolean;
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
  const [, startReadTransition] = useTransition();

  function expand(m: Msg) {
    setOpen((cur) => (cur === m.id ? null : m.id));
    if (!m.read_at && !optimisticRead.has(m.id)) {
      setOptimisticRead((s) => new Set(s).add(m.id));
      startReadTransition(async () => {
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
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {m.body}
                </p>
                {m.canReply && (
                  <ReplyBox messageId={m.id} senderName={senderName} />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReplyBox({
  messageId,
  senderName,
}: {
  messageId: string;
  senderName: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit() {
    if (!body.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("original_message_id", messageId);
    fd.set("body", body.trim());
    startTransition(async () => {
      try {
        const res = await sendReply(fd);
        if (res.ok) {
          setSuccess(true);
          setBody("");
          setTimeout(() => {
            setOpen(false);
            setSuccess(false);
          }, 1000);
        } else {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 active:scale-[0.97]"
      >
        <Reply className="h-3.5 w-3.5" />
        Répondre
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        Répondre à {senderName}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="input resize-none text-sm"
        placeholder="Votre réponse…"
        maxLength={2000}
        autoFocus
      />
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Réponse envoyée.
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setBody("");
            setError(null);
          }}
          disabled={pending}
          className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-medium text-slate-700"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="btn-primary flex-1 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Envoyer
        </button>
      </div>
    </div>
  );
}
