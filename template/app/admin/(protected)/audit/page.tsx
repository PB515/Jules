import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { ShieldAlert } from '@/lib/icons';
import type { AuditAction } from '@/lib/supabase/database.types';

export const metadata = { title: 'Audit Log' };

/**
 * Super Admin only — the platform-wide accountability tool. A club-scoped
 * Professor/Committee Member has no reason to see other clubs' staff
 * actions, and every action logged here is already attributable to a real
 * individual account (0038's RBAC rework + 0041's expanded audit trail),
 * which is the whole point: "even find that person" for a sabotaged event.
 */
const ACTION_LABEL: Record<AuditAction, string> = {
  force_reset: 'Force reset a password',
  manual_joule_adjustment: 'Manually adjusted Joules',
  csv_import: 'Imported questions via CSV',
  role_change: 'Changed an admin role',
  event_create: 'Created an event',
  event_edit: 'Edited an event',
  report_create: 'Wrote an Event Report',
  gallery_upload: 'Uploaded a Gallery photo',
  live_round_create: 'Started a Live Round',
};

export default async function AuditLogPage() {
  await requireAdmin(['super_admin']);
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('audit_log_entries')
    .select('id, action, details, created_at, admin_id, target_student_id, admins!audit_log_entries_admin_id_fkey(name, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-medium">Audit Log</h1>
        <p className="text-xs text-tertiary">The most recent 200 staff actions, newest first.</p>
      </div>

      {!entries || entries.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nothing logged yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{ACTION_LABEL[e.action] ?? e.action}</p>
                <span className="shrink-0 text-xs text-tertiary">{new Date(e.created_at).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
              </div>
              <p className="text-xs text-tertiary">
                {e.admins?.name ?? 'Unknown'} · {e.admins?.email ?? e.admin_id}
              </p>
              {e.details && Object.keys(e.details as object).length > 0 ? (
                <p className="font-mono text-xs text-muted">{JSON.stringify(e.details)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
