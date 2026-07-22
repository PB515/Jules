/**
 * Thin wrapper around the log_admin_action() RPC (0041) — every Server
 * Action that mutates something worth being able to trace back to a
 * specific person's account calls this once at its success path. Never
 * awaited in a way that blocks the actual mutation from succeeding if
 * logging itself fails (best-effort, matching this project's existing
 * posture on non-critical side effects) — but errors are still surfaced
 * to the server console, not silently swallowed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export type AuditAction =
  | 'event_create'
  | 'event_edit'
  | 'report_create'
  | 'gallery_upload'
  | 'live_round_create';

export async function logAdminAction(
  supabase: SupabaseClient<Database>,
  action: AuditAction,
  details: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.rpc('log_admin_action', {
    p_action: action,
    p_details: details,
  });
  if (error) {
    console.error(`logAdminAction(${action}) failed:`, error.message);
  }
}
