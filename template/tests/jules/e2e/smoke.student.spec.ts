import { test, expect } from '@playwright/test';

/**
 * See smoke.professor.spec.ts for why this is split by filename suffix
 * rather than one shared spec file.
 */
test('storageState reuses an authenticated student session', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
  // The mobile-PWA gate (pwa-gate.tsx) fails closed by default and only
  // flips to real content once its client effect confirms the dev bypass
  // cookie — this assertion is the actual proof Layer 2 passed, not just
  // that the URL didn't redirect.
  await expect(page.getByText('Synergy is built for your phone')).not.toBeVisible();
});
