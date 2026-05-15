"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { sendMessageInThread } from "@/app/actions/director";

export function ThreadComposer({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    const payload = body.trim();
    startTransition(async () => {
      try {
        const res = await sendMessageInThread(partnerId, payload);
        if (res.ok) {
          setBody("");
          // Soft refresh so the new message appears immediately at the
          // bottom of the thread.
          router.refresh();
        } else {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="input resize-none text-sm"
          placeholder="Votre message…"
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit(e as any);
            }
          }}
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          aria-label="Envoyer"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-tile disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
}
