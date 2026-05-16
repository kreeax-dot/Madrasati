"use client";

/**
 * Hard escape hatch for users stuck on a stale PWA build.
 *
 * Tells every browser API we know about to forget Madrasati:
 *   - unregister every service worker for the origin
 *   - delete every CacheStorage entry
 *   - clear localStorage + sessionStorage
 *   - delete every IndexedDB database
 *
 * Then hard-reloads the user back to /login with a cache-busting
 * query parameter so the browser refetches the entry HTML and JS
 * from the network.
 *
 * If a user reports being stuck on an old version, sending them to
 * `<your-domain>/force-update` is the nuclear option that always works.
 */
import { useEffect, useState } from "react";

export default function ForceUpdatePage() {
  const [status, setStatus] = useState("Nettoyage en cours…");

  useEffect(() => {
    (async () => {
      try {
        // 1. Unregister every service worker.
        if ("serviceWorker" in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
              regs.map((r) => r.unregister().catch(() => false)),
            );
          } catch {
            /* ignore */
          }
        }

        // 2. Delete every cache.
        if ("caches" in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
          } catch {
            /* ignore */
          }
        }

        // 3. Wipe storage.
        try {
          localStorage.clear();
        } catch {
          /* ignore */
        }
        try {
          sessionStorage.clear();
        } catch {
          /* ignore */
        }

        // 4. Drop every IndexedDB the browser created for this origin.
        try {
          // databases() exists on modern Chrome/Firefox/Safari.
          const anyIDB = indexedDB as any;
          if (anyIDB?.databases) {
            const dbs = (await anyIDB.databases()) as Array<{ name?: string }>;
            await Promise.all(
              dbs
                .filter((d) => d?.name)
                .map(
                  (d) =>
                    new Promise<void>((resolve) => {
                      const req = indexedDB.deleteDatabase(d.name as string);
                      req.onsuccess = req.onerror = req.onblocked = () => resolve();
                    }),
                ),
            );
          }
        } catch {
          /* ignore */
        }

        setStatus("Terminé. Redirection…");
        // Hard-reload to /login with a cache-busting query so the browser
        // refetches the entry HTML from the network.
        setTimeout(() => {
          window.location.replace(`/login?_v=${Date.now()}`);
        }, 600);
      } catch {
        setStatus("Erreur — rechargez la page manuellement.");
      }
    })();
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900">Mise à jour forcée</h1>
      <p className="text-sm text-slate-600">{status}</p>
      <p className="mt-2 text-xs text-slate-400">
        Suppression des caches, services workers et données locales.
      </p>
    </main>
  );
}
