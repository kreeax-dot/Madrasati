// Madrasati service worker — v19 (NUCLEAR UPDATE).
//
// This release wipes EVERY previous cache on activation, no matter what
// version produced them. Use it when users are stuck on a stale build
// (e.g. v7 still showing after a v18 push). After this SW activates once,
// every subsequent navigation is fetched fresh from the network.
//
// Caching strategy:
//   • HTML / RSC navigation  → network-first (network only, actually:
//                              we don't even cache HTML anymore — pure
//                              passthrough fetch).
//   • /_next/static/*         → cache-first (content-hashed, immutable).
//   • /icons/*, /manifest.json → cache-first.
//   • Anything else           → network only.

const VERSION = "v21";
const STATIC_CACHE = `madrasati-static-${VERSION}`;
const ICON_CACHE = `madrasati-icons-${VERSION}`;
const ALL_CACHES = [STATIC_CACHE, ICON_CACHE];

self.addEventListener("install", (event) => {
  // Take over immediately — don't wait for old tabs to close.
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(ICON_CACHE)
      .then((c) =>
        c
          .addAll(["/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"])
          .catch(() => undefined),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // NUKE everything that isn't on the current version's allowlist.
      // This intentionally catches any cache from any previous version,
      // including old stale-while-revalidate v7-era caches that had HTML
      // and JS chunks stuck inside.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k).catch(() => false)),
      );
      await self.clients.claim();

      // Tell every controlled client to reload right now so the user
      // jumps to the new build without having to refresh manually.
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => {
        try {
          c.postMessage({ type: "MADRASATI_RELOAD" });
        } catch {
          /* ignore */
        }
      });
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navigation requests (HTML pages): pure network — no caching at all.
  //    Even on offline, we let the request fail rather than serve stale HTML.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(fetch(request));
    return;
  }

  // 2. Next.js RSC payloads / data: network only.
  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/_next/data/")) {
    event.respondWith(fetch(request));
    return;
  }

  // 3. Immutable static build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. App icons + manifest: cache-first.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    event.respondWith(cacheFirst(request, ICON_CACHE));
    return;
  }

  // 5. Everything else: network-only.
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "offline" });
  }
}
