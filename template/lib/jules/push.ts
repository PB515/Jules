/**
 * Web Push sending — the two notification types confirmed with the user:
 * Type 1 "new event declared" (studentIds = null, broadcast to everyone)
 * and Type 2 "event info" (studentIds = the exact event_registrations rows
 * for that event; nobody else gets anything). Reads push_subscriptions via
 * the service-role client (bypasses RLS by design — this table has zero
 * client-facing policies at all, decision "push notifications"), same
 * trusted-server-context posture bulkCreateStudentsAction already uses.
 *
 * A push-sending failure must never block the admin action that triggered
 * it (creating/editing an event) — callers wrap this in their own
 * try/catch and log-only-on-failure, matching the fire-and-forget posture
 * already established for e.g. logAdminAction.
 */
import 'server-only';
import webpush from 'web-push';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToStudents(studentIds: string[] | null, payload: PushPayload): Promise<void> {
  ensureConfigured();
  const service = createServiceRoleClient();

  let query = service.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (studentIds !== null) {
    if (studentIds.length === 0) return;
    query = query.in('student_id', studentIds);
  }
  const { data: subs } = await query;
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body
      )
    )
  );

  // A 404/410 means the browser expired/revoked this subscription —
  // standard web-push hygiene is to drop the dead row so future sends
  // don't keep paying for a request that will only ever fail.
  const deadIds = results
    .map((r, i) => ({ r, id: subs[i].id }))
    .filter(({ r }) => r.status === 'rejected' && isGoneError(r.reason))
    .map(({ id }) => id);
  if (deadIds.length > 0) {
    await service.from('push_subscriptions').delete().in('id', deadIds);
  }
}

function isGoneError(reason: unknown): boolean {
  const status = (reason as { statusCode?: number })?.statusCode;
  return status === 404 || status === 410;
}
