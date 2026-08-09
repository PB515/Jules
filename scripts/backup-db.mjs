#!/usr/bin/env node
/**
 * backup-db — a logical data backup, not a full pg_dump (no pg_dump binary
 * available in this project's dev environment). Schema is already fully
 * reproducible from db/migrations/*.sql, so this only needs to protect DATA
 * — every public-schema table's rows, dumped to one timestamped JSON file
 * per table under backups/<timestamp>/.
 *
 * Motivated by the Tokyo project's total, unexplained disappearance
 * (decision 86) — Supabase's free tier has no point-in-time recovery, so
 * this is the only safety net that exists. Run it periodically (after any
 * real content change) and keep copies somewhere outside this repo/machine
 * too — a local git commit alone doesn't protect against losing the machine.
 *
 * Usage:
 *   cd jules
 *   $env:DATABASE_URL = '<pooler connection string>'   (PowerShell)
 *   node scripts/backup-db.mjs
 */
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL first.');
  process.exit(1);
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = resolve('backups', stamp);
  mkdirSync(outDir, { recursive: true });

  try {
    const { rows: tables } = await client.query(`
      select tablename from pg_tables
      where schemaname = 'public'
      order by tablename
    `);

    let totalRows = 0;
    for (const { tablename } of tables) {
      const { rows } = await client.query(`select * from "${tablename}"`);
      writeFileSync(resolve(outDir, `${tablename}.json`), JSON.stringify(rows, null, 2), 'utf8');
      totalRows += rows.length;
      console.log(`  ${tablename}: ${rows.length} rows`);
    }

    console.log(`\nBackup written to ${outDir} (${tables.length} tables, ${totalRows} total rows)`);
    console.log('Copy this folder somewhere outside this machine too — local disk alone is not a real backup.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
