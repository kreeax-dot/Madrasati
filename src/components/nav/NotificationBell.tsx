"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Inbox, X } from "lucide-react";
import { features } from "@/lib/features";
import type { NotifItem } from "@/lib/notifications";

/**
 * Per-user lastSeen key so a different user logging in on the same device
 * never inherits "everything read" from the previous account.
 */
const STORAGE_PREFIX = "madrasati:notif:lastSeen:";

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

export function NotificationBell({
  items,
  userId,
}: {
  items: NotifItem[];
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>("");
  const storageKey = STORAGE_PREFIX + userId;

  useEffect(() => {
    try {
      setLastSeen(localStorage.getItem(storageKey) ?? "");
    } catch {
      /* private-mode etc. */
    }
  }, [storageKey]);

  const unread = useMemo(
    () => items.filter((i) => !lastSeen || i.timestamp > lastSeen).length,
    [items, lastSeen],
  );

  const closePanel = useCallback(() => {
    try {
      if (items[0]) {
        localStorage.setItem(storageKey, items[0].timestamp);
        setLastSeen(items[0].timestamp);
      }
    } catch {
      /* still close */
    }
    setOpen(false);
  }, [items, storageKey]);

  // ESC closes; body scroll locked while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closePanel]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600 active:scale-[0.96]"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          /* Flex bottom-sheet layout: the dialog is `fixed inset-0 flex
             items-end`, so the panel naturally sits at the bottom of the
             VIEWPORT (not pushed above by stale `absolute bottom:0` quirks
             that left only the footer visible on some iOS Safari builds). */
          className="fixed inset-0 z-[60] flex items-end justify-center"
        >
          {/* Backdrop */}
          <button
            type="button"
            onClick={closePanel}
            aria-label="Fermer les notifications"
            className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-card"
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Drag handle */}
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-200" />

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Activité récente
                </p>
                <p className="text-base font-bold text-slate-900">
                  Notifications
                  {items.length > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-slate-400">
                      · {items.length}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:scale-[0.96]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable list — `flex-1 min-h-0` is the magic combo that
                lets a flex child scroll without pushing the footer below
                the viewport. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 py-12 text-slate-400">
                  <Inbox className="h-7 w-7" />
                  <p className="text-sm">Aucune notification.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((n) => {
                    const f = features[n.feature];
                    const Icon = f.icon;
                    const isNew = !lastSeen || n.timestamp > lastSeen;
                    return (
                      <li
                        key={n.id}
                        className="flex items-start gap-3 px-5 py-3.5"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.bgSoft} ${f.text}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={`truncate text-sm ${
                                isNew
                                  ? "font-semibold text-slate-900"
                                  : "font-medium text-slate-700"
                              }`}
                            >
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {timeAgo(n.timestamp)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                              {n.body}
                            </p>
                          )}
                        </div>
                        {isNew && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="shrink-0 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={closePanel}
                  className="w-full rounded-xl bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 active:scale-[0.98]"
                >
                  Tout marquer comme lu
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
