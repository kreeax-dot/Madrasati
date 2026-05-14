"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>("");
  const storageKey = STORAGE_PREFIX + userId;

  useEffect(() => {
    setMounted(true);
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

  // Render the portal contents (backdrop + panel). Mounted via React portal
  // so the panel lives DIRECTLY under document.body — escaping any sticky /
  // transformed / filtered ancestor that could create a containing block
  // and push the panel off-screen.
  const panel = open ? (
    <div className="madrasati-notif-root">
      {/* Backdrop */}
      <button
        type="button"
        onClick={closePanel}
        aria-label="Fermer les notifications"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 99998,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          border: 0,
          padding: 0,
          margin: 0,
          cursor: "default",
        }}
      />

      {/* Panel — explicit inline styles so no Tailwind class collision
          can re-introduce off-screen positioning. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "28rem",
          maxHeight: "min(85dvh, 85vh)",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          background: "white",
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
          boxShadow: "0 -8px 32px rgba(15, 23, 42, 0.15)",
          overflow: "hidden",
        }}
        className="animate-slide-up"
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

        <div
          className="overflow-y-auto overscroll-contain"
          style={{ flex: "1 1 auto", minHeight: 0 }}
        >
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
    </div>
  ) : null;

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

      {mounted && panel && createPortal(panel, document.body)}
    </>
  );
}
