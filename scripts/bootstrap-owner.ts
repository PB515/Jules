#!/usr/bin/env tsx
/**
 * bootstrap-owner — creates the FIRST Owner admin account.
 *
 * Every other admin is created from inside the app (Institution Settings →
 * Admin roster, owner-only, via the admin_create_admin RPC) — but that RPC
 * itself requires an existing Owner to call it. This script breaks that
 * chicken-and-egg loop with a one-off, service-role write. Run it exactly
 * once per environment, then manage all further admins from the app.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-owner.ts <email> <name>
 *
 * Reads Supabase keys from template/.env.local (same file the app uses).
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* file may not exist yet */
  }
  return out;
}

async function main() {
  const [email, name] = process.argv.slice(2);
  if (!email || !name) {
    console.error('usage: npx tsx scripts/bootstrap-owner.ts <email> <name>');
    process.exit(1);
  }

  const env = loadEnvFile(resolve('template/.env.local'));
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in template/.env.local');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const tempPassword = randomBytes(9).toString('base64url');

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    console.error('Could not create the auth user:', createErr?.message);
    process.exit(1);
  }

  const { error: insertErr } = await supabase
    .from('admins')
    .insert({ id: created.user.id, name, email, role: 'owner' });
  if (insertErr) {
    console.error('Auth user created, but the admins row failed:', insertErr.message);
    process.exit(1);
  }

  console.log('✓ Owner account created');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${tempPassword}  (relay this now, it will not be shown again)`);
  console.log('  Log in at /admin/login, then manage further admins from Institution Settings.');
}

main();
