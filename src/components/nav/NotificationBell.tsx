"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Inbox, X } from "lucide-react";
import { features } from "@/lib/features";
import type { NotifItem } from "@/lib/notifications";

const STORAGE_KEY = "madrasati:notif:lastSeen";

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function NotificationBell({ items }: { items: NotifItem[] }) {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>("");

  useEffect(() => {
    setLastSeen(localStorage.getItem(STORAGE_KEY) ?? "");
  }, []);

  const unread = useMemo(
    () => items.filter((i) => !lastSeen || i.timestamp > lastSeen).length,
    [items, lastSeen],
  );

  function openPanel() {
    setOpen(true);
  }

  function closePanel() {
    if (items[0]) {
      localStorage.setItem(STORAGE_KEY, items[0].timestamp);
      setLastSeen(items[0].timestamp);
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600 active:scale-[0.96]"
        aria-label="Notifications"
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
          <div
            onClick={closePanel}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-card safe-bottom">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Activité récente
                </p>
                <p className="text-base font-semibold text-slate-900">Notifications</p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70dvh] overflow-y-auto">
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
                      <li key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.bgSoft} ${f.text}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className={`truncate text-sm ${isNew ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {timeAgo(n.timestamp)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="truncate text-xs text-slate-500">{n.body}</p>
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
          </div>
        </>
      )}
    </>
  );
}
