"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Bell, Inbox, Loader2, X } from "lucide-react";
import { features } from "@/lib/features";
import { markAllNotificationsRead } from "@/app/actions/director";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
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
  const { t } = useTranslation();
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

  // Permanent dismiss: once lastSeen advances, any item whose timestamp
  // is older than lastSeen is HIDDEN from the panel entirely. Only items
  // strictly newer than lastSeen are visible.
  const visibleItems = useMemo(
    () =>
      lastSeen ? items.filter((i) => i.timestamp > lastSeen) : items,
    [items, lastSeen],
  );
  const unread = visibleItems.length;

  const [pendingMark, startMark] = useTransition();

  // Closing the panel does NOT mark anything as read. Only the explicit
  // "Tout marquer comme lu" footer button (markAllRead) advances
  // lastSeen, which permanently hides everything older than that moment.
  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  // "Mark all as read" — permanently dismisses everything older than NOW
  // from the panel (no reappearing), AND clears the unread `read_at` flag
  // on every received message in DB.
  const markAllRead = useCallback(() => {
    // Set lastSeen slightly in the future so even items with timestamps
    // exactly equal to "now" are dismissed.
    const cutoff = new Date(Date.now() + 1000).toISOString();
    try {
      localStorage.setItem(storageKey, cutoff);
      setLastSeen(cutoff);
    } catch {
      /* ignore */
    }
    startMark(async () => {
      try {
        await markAllNotificationsRead();
      } catch {
        /* non-fatal — lastSeen already hides locally */
      }
      setOpen(false);
    });
  }, [storageKey]);

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
              {t("notif.recentActivity")}
            </p>
            <p className="text-base font-bold text-slate-900">
              {t("notif.title")}
              {visibleItems.length > 0 && (
                <span className="ml-1.5 text-xs font-medium text-slate-400">
                  · {visibleItems.length}
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
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-slate-400">
              <Inbox className="h-7 w-7" />
              <p className="text-sm">{t("notif.empty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleItems.map((n) => {
                const f = features[n.feature];
                const Icon = f.icon;
                return (
                  <li key={n.id}>
                    <a
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex w-full items-start gap-3 px-5 py-3.5 text-left active:bg-slate-50"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-soft`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
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
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {visibleItems.length > 0 && (
          <div
            className="shrink-0 border-t border-slate-100 bg-white px-5 py-3"
            style={{
              paddingBottom: `calc(env(safe-area-inset-bottom) + 0.75rem)`,
            }}
          >
            <button
              type="button"
              onClick={markAllRead}
              disabled={pendingMark}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-tile active:scale-[0.98] disabled:opacity-60"
            >
              {pendingMark && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("notif.markAllRead")}
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
        aria-label={t("notif.title")}
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
