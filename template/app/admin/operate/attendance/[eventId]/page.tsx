import { OperatorStationClient } from './operator-station-client';

export const metadata = { title: 'Attendance' };

/**
 * The no-login "operator link" version of /admin/attendance — reachable
 * with no admin account at all, secured purely by a long random token in
 * the URL (see db/migrations/0051_operator_links.sql). Deliberately lives
 * outside app/admin/(protected)/*, whose layout unconditionally calls
 * requireAdmin() — and is listed in proxy.ts's PUBLIC_PATHS, since the
 * middleware's own unauthenticated-/admin/* redirect runs before any
 * page/layout code. No sidebar, no nav — a bare, focused screen for
 * whoever's actually running the room.
 */
export default async function OperatorAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { eventId } = await params;
  const { token } = await searchParams;
  return <OperatorStationClient eventId={eventId} token={token ?? ''} />;
}
