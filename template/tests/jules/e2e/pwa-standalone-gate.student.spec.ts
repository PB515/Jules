import { test, expect, devices, type Browser, type BrowserContext } from '@playwright/test';
import path from 'node:path';

/**
 * Standalone-mode dual-check (plan scenario 3, second half) — pwa-gate.tsx
 * (Layer 2 of the mobile-PWA-only gate) accepts EITHER signal:
 * `matchMedia('(display-mode: standalone)')` (Android/modern browsers) OR
 * `navigator.standalone` (older iOS Safari, which never supported the
 * display-mode media query). Decision 29 exists specifically because relying
 * on only one signal locks out real installed users on the other platform.
 * This asserts the gate never regresses to checking just one.
 *
 * Uses a mobile user agent (real signal, not the dev-bypass cookie) to pass
 * Layer 1 (proxy.ts), then overrides the two client-side signals directly
 * via addInitScript to isolate Layer 2's own logic. Critically, the reused
 * student storageState was captured by auth.setup.ts navigating through
 * ?devMobileBypass=1 — that cookie rides along in the snapshot and would
 * make Layer 2 pass unconditionally regardless of the real signals, so it's
 * explicitly cleared in every context here before the first navigation.
 *
 * Each test builds its own context explicitly (rather than using the
 * default page/context fixtures) so addInitScript can be installed before
 * the first navigation — this file's `.student.spec.ts` suffix only exists
 * to get it picked up by the `student` project in playwright.config.ts, its
 * default storageState isn't actually used here.
 */
const authFile = path.join(__dirname, '.auth', 'student-volt.json');

async function contextWithoutDevBypass(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({ ...devices['Pixel 7'], storageState: authFile });
  await context.clearCookies({ name: 'dev_mobile_bypass' });
  return context;
}

test('Android signal (display-mode: standalone) alone reveals real content', async ({ browser }) => {
  const context = await contextWithoutDevBypass(browser);
  await context.addInitScript(() => {
    window.matchMedia = ((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });
  const page = await context.newPage();
  await page.goto('/dashboard');
  await expect(page.getByText('Synergy is built for your phone')).not.toBeVisible();
  await context.close();
});

test('iOS signal (navigator.standalone) alone reveals real content', async ({ browser }) => {
  const context = await contextWithoutDevBypass(browser);
  await context.addInitScript(() => {
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
  });
  const page = await context.newPage();
  await page.goto('/dashboard');
  await expect(page.getByText('Synergy is built for your phone')).not.toBeVisible();
  await context.close();
});

test('neither signal present (a regular mobile browser tab) blocks with the install gate', async ({ browser }) => {
  // No signal overrides — a real mobile UA, but not launched from a
  // home-screen icon, so neither signal is true. This is the actual
  // "not installed yet" case the gate exists to catch.
  const context = await contextWithoutDevBypass(browser);
  const page = await context.newPage();
  await page.goto('/dashboard');
  await expect(page.getByText('Synergy is built for your phone')).toBeVisible();
  await context.close();
});
