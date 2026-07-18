import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Node doesn't auto-load .env.local outside the Next.js app itself — same
// pattern as tests/jules/db-helpers.ts's own loadEnv().
for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* absent — fine */
  }
}

/**
 * UI-layer half of the testing-harness initiative (DB-layer half lives in
 * tests/jules/*.test.ts, run by Vitest — see docs/... plan file for the
 * full rationale: scripted verification instead of hand-driving a browser
 * every session).
 *
 * Auth uses Playwright's documented *.setup.ts + storageState +
 * project-`dependencies` pattern: log in once per role/account in the
 * `setup` project, reuse the saved session everywhere else. Real,
 * concurrent multi-student scenarios (e.g. a Live Round) don't use these
 * projects directly — they load multiple storageState files into separate
 * `browser.newContext()` calls inside one test, per the plan's own note
 * that parallel *workers* aren't for simulating users interacting together.
 */
const authDir = path.join(__dirname, 'tests/jules/e2e/.auth');

export default defineConfig({
  testDir: './tests/jules/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'professor',
      // Scoped by filename suffix, not just directory — a spec file matching
      // every project would run under every role's storageState, including
      // roles that could never actually reach that page.
      testMatch: /.*\.professor\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: path.join(authDir, 'professor.json') },
      dependencies: ['setup'],
    },
    {
      name: 'student',
      testMatch: /.*\.student\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: path.join(authDir, 'student-volt.json') },
      dependencies: ['setup'],
    },
  ],
});
