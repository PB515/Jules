import { test, expect } from '@playwright/test';

/**
 * Installability checklist (plan scenario 3, first half) — targets two real
 * past bugs: decision 55 (missing PNG icons in the manifest — SVG-only
 * icons fail Chrome's installability check on Android) and decision 76 (the
 * legacy apple-mobile-web-app-capable meta tag, without which
 * navigator.standalone can stay false on older iOS/Safari even after
 * "Add to Home Screen", breaking pwa-gate.tsx's iOS signal entirely).
 */
test('manifest declares the icon sizes/types Chrome requires to consider the app installable', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();

  expect(manifest.display).toBe('standalone');

  const png192 = manifest.icons.find((i: { sizes: string; type: string }) => i.sizes === '192x192' && i.type === 'image/png');
  const png512 = manifest.icons.find((i: { sizes: string; type: string }) => i.sizes === '512x512' && i.type === 'image/png');
  const maskable512 = manifest.icons.find(
    (i: { sizes: string; type: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable'
  );

  expect(png192, '192x192 PNG icon required for installability').toBeTruthy();
  expect(png512, '512x512 PNG icon required for installability').toBeTruthy();
  expect(maskable512, 'a maskable 512x512 icon required for Android adaptive icons').toBeTruthy();
});

test('both the modern and legacy iOS standalone-capable meta tags are present', async ({ page }) => {
  await page.goto('/');
  // The legacy, apple-prefixed tag is the one decision 76 actually fixed —
  // without it, navigator.standalone can stay false on older iOS/Safari
  // even after Add to Home Screen, breaking pwa-gate.tsx's iOS signal.
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveCount(1);
});
