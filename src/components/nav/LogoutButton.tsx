"use client";

import { useState, useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Hard logout:
 *   1. Calls the server action — invalidates the Supabase session globally
 *      and wipes auth cookies server-side.
 *   2. Clears any app-owned localStorage keys (notification cursor, etc.)
 *      so a different user logging in on the same device doesn't inherit
 *      stale UI state.
 *   3. Tells the active service worker to unregister, then forces a hard
 *      reload to /login. That way no cached HTML from the previous role
 *      can leak through.
 */
export function LogoutButton({
  variant = "icon",
}: {
  variant?: "icon" | "menu";
}) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function go() {
    startTransition(async () => {
      // 1. clear client storage first — even if the server call hangs, the
      //    next page load will not have user-keyed state.
      try {
        localStorage.removeItem("madrasati:notif:lastSeen");
        // Remove anything else namespaced to the app.
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith("madrasati:")) localStorage.removeItem(k);
        }
        sessionStorage.clear();
      } catch {
        /* private mode etc. */
      }

      // 2. unregister all service workers so no cached HTML can survive.
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
        }
      } catch {
        /* non-fatal */
      }

      // 3. invoke the server action. It will redirect — but if it returns
      //    without redirecting (network blip), we force a hard reload anyway.
      try {
        await signOut();
      } finally {
        window.location.replace("/login");
      }
    });
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {t("auth.signout")}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600 active:scale-[0.96]"
        aria-label={t("auth.signout")}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
      </button>
      {confirming && (
        <>
          <div
            onClick={() => !pending && setConfirming(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <h3 className="text-base font-semibold text-slate-900">
              {t("auth.confirmSignout")}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t("auth.confirmSignoutBody")}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="btn-ghost"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={go}
                disabled={pending}
                className="btn inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
