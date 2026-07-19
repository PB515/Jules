import { test, expect } from '@playwright/test';

/**
 * Phase 0 (Admin PWA) — a second, distinct installable identity for
 * Professor/Committee Member, scoped to /admin. Student PWA is completely
 * untouched by this; the last two assertions in the second test exist
 * specifically to prove that (a regression here would mean the admin work
 * accidentally leaked into student pages).
 */
test('admin manifest declares a distinct name, start_url, and icon set from the student manifest', async ({ request }) => {
  const res = await request.get('/admin/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();

  expect(manifest.name).toBe('Synergy Staff');
  expect(manifest.start_url).toBe('/admin');
  expect(manifest.display).toBe('standalone');

  const png192 = manifest.icons.find((i: { sizes: string; type: string }) => i.sizes === '192x192' && i.type === 'image/png');
  const maskable512 = manifest.icons.find(
    (i: { sizes: string; type: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable'
  );
  expect(png192, '192x192 PNG icon required for installability').toBeTruthy();
  expect(maskable512, 'a maskable 512x512 icon required for Android adaptive icons').toBeTruthy();
  // The whole point of a second manifest is a visually distinct identity —
  // reusing the student icon path here would defeat it.
  expect(png192.src).toContain('icon-admin');
});

test('admin pages link the admin manifest (even logged out); student pages are unaffected', async ({ page }) => {
  // No auth — this is the actual proxy.ts regression this feature depends
  // on: /admin/get-app must be public, or a logged-out professor scanning
  // the QR code would get bounced to /admin/login before ever seeing it.
  await page.goto('/admin/get-app');
  await expect(page).toHaveURL(/\/admin\/get-app$/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin/manifest.webmanifest');
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Synergy Staff');

  await page.goto('/admin/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin/manifest.webmanifest');

  // Regression guard: student pages must still link the original manifest.
  await page.goto('/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
});
