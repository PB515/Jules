import { test, expect } from '@playwright/test';

/**
 * This project's single most-repeated real bug, hit at least five separate
 * times across manual verification this session alone: a cached service
 * worker serving old content instead of what a fresh deploy actually
 * shipped. The real cache name (app/sw.js/route.ts) is
 * `site-shell-${VERCEL_GIT_COMMIT_SHA ?? 'dev'}` — it changes on every real
 * deploy, and the SW's own `activate` handler deletes any cache whose name
 * doesn't match the current one. This test proves that eviction actually
 * works: seed a cache under a deliberately different ("previous deploy")
 * name before the real SW activates, then confirm activation deletes it and
 * a normal reload never serves its content.
 */
const STALE_CACHE_NAME = 'site-shell-fake-old-build-12345';
const STALE_MARKER = 'STALE-DEPLOY-MARKER-DO-NOT-SHOW';

test('service worker activation evicts a stale previous-deploy cache', async ({ page }) => {
  await page.goto('/');

  // Seed a fake "leftover from a previous deploy" cache under a name that
  // will never match the real SW's own CACHE constant, before waiting for
  // activation — the real SW's activate handler is what should clean this up.
  await page.evaluate(
    async ({ cacheName, marker }) => {
      const cache = await caches.open(cacheName);
      await cache.put('/', new Response(`<html><body>${marker}</body></html>`, { headers: { 'Content-Type': 'text/html' } }));
    },
    { cacheName: STALE_CACHE_NAME, marker: STALE_MARKER }
  );

  // Resolves once this scope has an active, controlling service worker —
  // i.e., install + activate (including the cache cleanup inside it) ran.
  await page.evaluate(() => navigator.serviceWorker.ready);

  const cacheNames = await page.evaluate(() => caches.keys());
  expect(cacheNames).not.toContain(STALE_CACHE_NAME);
  expect(cacheNames.some((n) => n.startsWith('site-shell-'))).toBe(true);

  // End-to-end proof, not just a cache-keys check: a real reload never
  // shows the stale marker, even though it was sitting in Cache Storage
  // under the exact URL this page navigates to.
  await page.reload();
  await expect(page.locator('body')).not.toContainText(STALE_MARKER);
});
