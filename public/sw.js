// The school, offline.
//
// A unit is a chapter to read, and reading happens on trains, in waiting
// rooms, and in the ten minutes before a shift. The site is a static export,
// so the whole classroom can live in a cache and keep working with no signal.
//
// Three rules, and they matter in this order:
//
//   1. Never cache the API. Progress, the Quad, the bell and the Registrar
//      are conversations with a server; a stale answer is worse than an
//      honest failure. Requests to /api/ go to the network and nowhere else.
//   2. Hashed build assets are immutable, so they are cache-first forever.
//      A new build asks for new filenames and the old ones get swept.
//   3. Pages are network-first with a cache fallback, so a student online
//      always sees the current lesson and a student offline still sees the
//      one they read last week.
//
// Hand-written rather than generated: the whole thing is short enough to
// read, and a build step that emits a service worker is a build step that
// can silently ship the wrong one.

const VERSION = "sms-v2";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;

// Enough to open the door with no signal at all.
const SHELL_URLS = ["/", "/learn/", "/offline/", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // One at a time: a single 404 in addAll rejects the whole install and
      // leaves the student with no service worker at all.
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {}
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|avif|ico|mp4|mp3)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Rule 1: the API is never cached, and never served from a cache.
  if (url.pathname.startsWith("/api/")) return;

  // Rule 2: hashed assets never change under a given name.
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) (await caches.open(ASSETS)).put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  // Rule 3: pages are network-first, cache second, offline page last.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) (await caches.open(PAGES)).put(request, res.clone());
          return res;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match("/offline/")) ||
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
          );
        }
      })()
    );
  }
});

// A page is not readable offline just because its HTML is cached: the lesson
// itself lives in the route's JavaScript. Pull every build asset the document
// references so a unit nobody has opened still opens with no signal.
function assetUrlsIn(html) {
  const out = new Set();
  const re = /(?:src|href)="(\/_next\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

// "Take this course with me." The classroom asks for a list of pages and the
// worker pulls them in, reporting as it goes so the button can show progress.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  const client = event.source;
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES);
      const assets = await caches.open(ASSETS);
      let done = 0;
      let failed = 0;
      const seenAssets = new Set();

      for (const url of data.urls) {
        try {
          const res = await fetch(url, { credentials: "same-origin" });
          if (res.ok) {
            const isPage = !isAsset(new URL(url, self.location.origin));
            if (isPage) {
              const html = await res.clone().text();
              await pages.put(url, res.clone());
              for (const a of assetUrlsIn(html)) {
                if (seenAssets.has(a)) continue;
                seenAssets.add(a);
                if (await assets.match(a)) continue;
                try {
                  const ar = await fetch(a, { credentials: "same-origin" });
                  if (ar.ok) await assets.put(a, ar.clone());
                } catch {}
              }
            } else {
              await assets.put(url, res.clone());
            }
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
        done++;
        client?.postMessage({ type: "cache-progress", done, total: data.urls.length, failed });
      }
      client?.postMessage({ type: "cache-done", done, total: data.urls.length, failed });
    })()
  );
});
