"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Inbox, X } from "lucide-react";
import { features } from "@/lib/features";
import type { NotifItem } from "@/lib/notifications";

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
      /* ignore */
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
      /* ignore */
    }
    setOpen(false);
  }, [items, storageKey]);

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
        <>
          {/* Backdrop — independent fixed element, full viewport, behind panel */}
          <button
            type="button"
            onClick={closePanel}
            aria-label="Fermer les notifications"
            className="fixed inset-0 z-[60] cursor-default bg-slate-900/40 backdrop-blur-sm animate-fade-in"
          />

          {/* Panel — independent fixed element pinned to bottom of viewport.
              No nested flex, no `absolute` inside `fixed`, no `safe-bottom`
              padding (which could leave a strip below the footer that made
              the panel look pushed up on some devices). Explicit
              `bottom: 0` + `max-height: min(85dvh, calc(100vh - 4rem))`
              fallback ensures the panel always fits on screen. */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-1/2 z-[61] flex w-full max-w-md -translate-x-1/2 flex-col overflow-hidden rounded-t-3xl bg-white shadow-card animate-slide-up"
            style={{
              // dvh is the dynamic viewport — collapses with mobile URL bars.
              maxHeight: "min(85dvh, calc(100vh - 4rem))",
            }}
          >
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-200" />

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

            {/* `min-h-0 flex-1 overflow-y-auto` is the canonical scroll combo
                inside a flex column. */}
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
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-soft`}
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
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div
                className="shrink-0 border-t border-slate-100 bg-white px-5 py-3"
                style={{
                  paddingBottom: `calc(env(safe-area-inset-bottom) + 0.75rem)`,
                }}
              >
                <button
                  type="button"
                  onClick={closePanel}
                  className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-tile active:scale-[0.98]"
                >
                  Tout marquer comme lu
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
