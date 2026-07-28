/**
 * Web Push sending + in-app notification history — the two notification
 * types confirmed with the user: Type 1 "new event declared" (studentIds =
 * null, broadcast to everyone) and Type 2 "event info" (studentIds = the
 * exact event_registrations rows for that event, or a manual "Updates" tab
 * send; nobody else gets anything). Reads push_subscriptions via the
 * service-role client (bypasses RLS by design — this table has zero
 * client-facing policies at all, decision "push notifications"), same
 * trusted-server-context posture bulkCreateStudentsAction already uses.
 *
 * Also writes a `notifications` row per targeted student — not a separate
 * system, per the plan. This happens for the FULL target audience,
 * independent of who actually has a push subscription: someone should
 * still see it in-app even if they never enabled push. Writing history
 * happens before the push attempt, since it must succeed regardless of
 * whether push delivery does.
 *
 * A push-sending failure must never block the admin action that triggered
 * it (creating/editing/messaging about an event) — callers wrap this in
 * their own try/catch and log-only-on-failure, matching the fire-and-forget
 * posture already established for e.g. logAdminAction.
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
  const service = createServiceRoleClient();

  // Resolve the full target audience for notification history — a
  // broadcast (null) has to be enumerated to insert one row per student,
  // unlike the push_subscriptions query below which can skip the filter.
  let audienceIds = studentIds;
  if (audienceIds === null) {
    const { data: allStudents } = await service.from('students').select('id');
    audienceIds = (allStudents ?? []).map((s) => s.id);
  }
  if (audienceIds.length === 0) return;

  await service.from('notifications').insert(
    audienceIds.map((student_id) => ({
      student_id,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
    }))
  );

  ensureConfigured();
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('student_id', audienceIds);
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
