import { OperatorHostClient } from './operator-host-client';

export const metadata = { title: 'Live Round' };

/**
 * The no-login "operator link" version of the Live Round host screen —
 * reachable with no admin account, secured purely by a long random token
 * in the URL (see db/migrations/0051_operator_links.sql). Lives outside
 * app/admin/(protected)/*, and is listed in proxy.ts's PUBLIC_PATHS, same
 * reasoning as the attendance operator route right next to it.
 */
export default async function OperatorLiveRoundPage({
  params,
  searchParams,
}: {
  params: Promise<{ roundId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { roundId } = await params;
  const { token } = await searchParams;
  return <OperatorHostClient roundId={roundId} token={token ?? ''} />;
}
