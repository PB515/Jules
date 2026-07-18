import { test as setup } from '@playwright/test';
import path from 'node:path';

/**
 * Logs in each demo account once and saves its session as storageState, so
 * downstream tests never re-run a login flow — per the plan's documented
 * Playwright pattern. Credentials come from docs/runbooks/demo-credentials.md
 * (LOCAL ONLY, gitignored — never hardcode real passwords in a committed
 * test file; read them from env instead, filled in per-machine).
 *
 * Student routes are gated to installed-PWA-only in production (proxy.ts +
 * pwa-gate.tsx). The existing DEV_BYPASS_COOKIE mechanism (dev-only,
 * NODE_ENV-gated, already used for manual local verification all session)
 * is the intended way to exercise them from a real browser context here —
 * visiting any route with ?devMobileBypass=1 sets the cookie for the rest
 * of the session, satisfying both Layer 1 (proxy.ts) and Layer 2
 * (pwa-gate.tsx, which also reads the same cookie client-side).
 *
 * These logins run serial, not parallel, on purpose: Supabase Auth applies
 * its own per-IP sign-in rate limit, separate from this app's in-app
 * rateLimit() check — 5 simultaneous signInWithPassword() calls from one
 * machine tripped it intermittently (surfaced by the app as a generic
 * "Incorrect email or password", indistinguishable from a real bad
 * password). Serial execution avoids bursting that limit; it costs a few
 * seconds once per full test run, not per scenario.
 */
setup.describe.configure({ mode: 'serial' });

const authDir = path.join(__dirname, '.auth');

const PROFESSOR = {
  email: process.env.TEST_PROFESSOR_EMAIL ?? 'jules.owner.demo@gmail.com',
  password: process.env.TEST_PROFESSOR_PASSWORD,
};

const STUDENTS = [
  { key: 'volt', email: process.env.TEST_STUDENT_VOLT_EMAIL ?? 'jules.demo.volt@gmail.com', password: process.env.TEST_STUDENT_VOLT_PASSWORD },
  { key: 'amp', email: process.env.TEST_STUDENT_AMP_EMAIL ?? 'jules.demo.amp@gmail.com', password: process.env.TEST_STUDENT_AMP_PASSWORD },
  { key: 'ohm', email: process.env.TEST_STUDENT_OHM_EMAIL ?? 'jules.demo.ohm@gmail.com', password: process.env.TEST_STUDENT_OHM_PASSWORD },
  { key: 'watt', email: process.env.TEST_STUDENT_WATT_EMAIL ?? 'jules.demo.watt@gmail.com', password: process.env.TEST_STUDENT_WATT_PASSWORD },
];

setup('authenticate as professor', async ({ page }) => {
  if (!PROFESSOR.password) setup.skip(true, 'TEST_PROFESSOR_PASSWORD not set, see docs/runbooks/demo-credentials.md');
  await page.goto('/admin/login');
  await page.locator('input[name="email"]').fill(PROFESSOR.email);
  await page.locator('input[name="password"]').fill(PROFESSOR.password!);
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.waitForURL('**/admin');
  await page.context().storageState({ path: path.join(authDir, 'professor.json') });
});

for (const student of STUDENTS) {
  setup(`authenticate as student (${student.key})`, async ({ page }) => {
    if (!student.password) setup.skip(true, `TEST_STUDENT_${student.key.toUpperCase()}_PASSWORD not set, see docs/runbooks/demo-credentials.md`);
    // Sets the dev-mobile-bypass cookie for the rest of this context before
    // the student route gate (proxy.ts) is ever hit by the post-login redirect.
    await page.goto('/login?devMobileBypass=1');
    await page.locator('input[name="email"]').fill(student.email);
    await page.locator('input[name="password"]').fill(student.password!);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard');
    await page.context().storageState({ path: path.join(authDir, `student-${student.key}.json`) });
  });
}
