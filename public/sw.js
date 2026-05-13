// Madrasati service worker — v5.
//
// Caching strategy is deploy-safe:
//   • HTML / RSC navigation        → network-first (so new deploys are seen)
//   • /_next/static/*               → cache-first  (content-hashed, immutable)
//   • /icons/*, /manifest.json      → cache-first  (small, rarely changes)
//   • Anything else                 → network only (no caching)
//
// On activate, all previous caches are dropped so a new SW immediately purges
// the old build's HTML/JS. The accompanying client (PWARegister.tsx) listens
// for the `controllerchange` event and reloads.

const VERSION = "v8";
const HTML_CACHE = `madrasati-html-${VERSION}`;
const STATIC_CACHE = `madrasati-static-${VERSION}`;
const ICON_CACHE = `madrasati-icons-${VERSION}`;
const ALL_CACHES = [HTML_CACHE, STATIC_CACHE, ICON_CACHE];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ICON_CACHE).then((c) =>
      c.addAll(["/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"]).catch(() => undefined),
    ),
  );
  // Activate this SW as soon as it's installed — don't wait for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Allow page to force-activate a waiting SW via postMessage.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navigation requests (HTML pages): network-first, fall back to cache.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request, HTML_CACHE));
    return;
  }

  // 2. Next.js RSC payloads (?_rsc=…) and data requests: network only — never
  //    serve stale Server Component payloads.
  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/_next/data/")) {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 504 })));
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

  // 5. Everything else: network only (don't cache API responses, etc).
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline + nothing cached → empty 504 (page will show its own offline UI).
    return new Response("", { status: 504, statusText: "offline" });
  }
}

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
  } catch (err) {
    return new Response("", { status: 504, statusText: "offline" });
  }
}
