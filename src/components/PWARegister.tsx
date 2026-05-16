"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and AGGRESSIVELY chases updates so users
 * never get stuck on a stale build.
 *
 *   1. Register /sw.js with updateViaCache: "none" — bypasses HTTP
 *      cache when the browser checks for SW script updates.
 *   2. Kick an immediate update check on mount.
 *   3. Whenever the tab becomes visible again, check again.
 *   4. Whenever a waiting SW exists, send SKIP_WAITING.
 *   5. When the controller actually changes (= new SW took over), do
 *      a hard cache-busting reload.
 *   6. Also reload on a MADRASATI_RELOAD message broadcast by the SW
 *      after it nukes the old caches on activate.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reloaded = false;
    const hardReload = () => {
      if (reloaded) return;
      reloaded = true;
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("_v", String(Date.now()));
        window.location.replace(u.toString());
      } catch {
        window.location.reload();
      }
    };

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        reg.update().catch(() => undefined);

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => undefined);
          }
        });

        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage("SKIP_WAITING");
        }

        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (
              next.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              next.postMessage("SKIP_WAITING");
            }
          });
        });

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          hardReload,
        );

        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "MADRASATI_RELOAD") {
            hardReload();
          }
        });
      } catch {
        /* SW registration failures are non-critical */
      }
    };

    if (document.readyState === "complete") setup();
    else window.addEventListener("load", setup, { once: true });
  }, []);

  return null;
}
