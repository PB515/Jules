/**
 * Shared helpers for this project's DB-layer test scenarios (the testing-
 * harness initiative — see the plan file's "SEPARATE INITIATIVE" section).
 *
 * These formalize the `SET LOCAL request.jwt.claims` / `SET LOCAL ROLE
 * authenticated` technique already used by hand throughout this project's
 * manual RLS verification (decisions 46, 47, 60, 73, 77) into a real,
 * re-runnable helper, rather than a one-off throwaway script each time.
 *
 * Targets the real hosted dev DB directly (this project has no local
 * Docker/Supabase stack) — every scenario creates narrowly-scoped, uniquely-
 * named fixtures and deletes precisely those rows afterward. Never TRUNCATE
 * against this DB (unlike tooling/verify.ts's local-only harness, which
 * refuses non-local URLs for exactly that reason).
 */
import pg from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function loadEnv(): void {
  for (const f of ['.env.local', '.env']) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* absent — fine */
    }
  }
}
loadEnv();

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL required (.env.local), see docs/runbooks/jules-setup.md');
  return url;
}

export async function connect(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: databaseUrl() });
  await client.connect();
  return client;
}

/** Service-role client — bypasses RLS. For creating/deleting test fixtures only. */
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('serviceClient() needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Run queries as a specific authenticated user, inside a transaction that's
 * ALWAYS rolled back afterward — safe for RLS-boundary checks (row counts,
 * accept/reject) against the shared hosted DB with zero risk of a lingering
 * side effect, even if the check itself performs an UPDATE/INSERT.
 */
export async function asUserRollback<T>(
  client: pg.Client,
  userId: string,
  fn: (client: pg.Client) => Promise<T>
): Promise<T> {
  await client.query('begin');
  try {
    await client.query('select set_config($1, $2, true)', [
      'request.jwt.claims',
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    await client.query('set local role authenticated');
    return await fn(client);
  } finally {
    await client.query('rollback').catch(() => {});
  }
}

/** A short, unique-enough suffix for fixture names/emails/slugs per test run. */
export function testId(): string {
  return `t${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}
