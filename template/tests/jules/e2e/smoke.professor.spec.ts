import { test, expect } from '@playwright/test';

/**
 * Proves the UI-layer testing infra works end-to-end (auth.setup.ts ->
 * storageState -> a real authenticated page load) before any real scenario
 * (plan items 1-3) gets built on top of it. Not a scenario itself.
 *
 * Filename suffix (.professor.spec.ts) is what scopes this to the
 * `professor` project in playwright.config.ts — see that file's per-project
 * testMatch. Without that split, every spec would run under every project's
 * storageState, including roles that would never actually reach this page.
 */
test('storageState reuses an authenticated admin session', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
  // "Reactor Command Center" also appears as plain branding text inside the
  // admin shell itself, not just the login page — the login page is the
  // only place it's an <h1>, so that's what actually distinguishes them.
  await expect(page.getByRole('heading', { level: 1, name: 'Reactor Command Center' })).not.toBeVisible();
});
