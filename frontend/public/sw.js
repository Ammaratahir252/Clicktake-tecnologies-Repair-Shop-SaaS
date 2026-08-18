// Minimal, safe service worker: PWA installability + a bit of offline resilience.
// Deliberately NOT a full offline-first app (Next.js build chunks are
// content-hashed per deploy, so precaching a fixed asset list would go stale
// the moment a new version ships). Strategy is network-first everywhere:
// always prefer the live network response so users never see stale app code
// or stale data, and only fall back to whatever's in the cache (or the
// offline page, for navigations) when the network is genuinely unreachable.

const CACHE_NAME = "dibnow-runtime-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, "/favicon.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever intercept safe, idempotent GETs — never touch mutating requests
  // (POST/PUT/PATCH/DELETE) so form submissions and API writes always go
  // straight to the network untouched, offline or not.
  if (request.method !== "GET") return;

  // Never cache API responses — they're per-tenant/per-user live data, not
  // something that should ever be served stale from a shared cache.
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          return caches.match(OFFLINE_URL);
        }
        return Response.error();
      })
  );
});
