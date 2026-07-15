/**
 * Service worker, served as a Route Handler instead of a static public/ file
 * specifically so the cache name can be derived from the real deployment
 * (Vercel sets VERCEL_GIT_COMMIT_SHA automatically) rather than a hand-edited
 * constant — the previous static sw.js hardcoded `site-shell-v1` and was
 * never bumped across any deploy in this project's history, so once a page
 * was cached it stayed cached forever regardless of what shipped afterward.
 *
 * Strategy: network-first for navigations/pages (a new deploy is always seen
 * immediately; cache is only a fallback when genuinely offline) and
 * cache-first only for /_next/static/* — those paths are already content-
 * hashed by Next.js, so caching them forever is safe; the URL itself changes
 * when the content does.
 */
export async function GET() {
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev';

  const body = `
const CACHE = 'site-shell-${buildId}';
const SHELL = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never cache mutations

  const url = new URL(request.url);
  const isHashedAsset = url.pathname.startsWith('/_next/static/');

  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
`.trimStart();

  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache',
    },
  });
}
