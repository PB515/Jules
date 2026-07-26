/**
 * Real generated club cover art (frontend overhaul, decision: "Adani brand
 * system + real generated assets"), keyed by club name rather than slug —
 * the exact live `clubs.slug` values weren't independently confirmed against
 * the DB from this session, and matching on the real names from decision 64
 * (guaranteed correct) is just as reliable. Falls back to null (callers
 * render `EventCoverPlaceholder` instead) for any club not in this set —
 * e.g. the retired demo clubs, or a future real club with no art yet.
 */
const CLUB_COVERS: Record<string, string> = {
  joules: '/clubs/joules.jpg',
  gati: '/clubs/gati.jpg',
  cityscape: '/clubs/cityscape.jpg',
  shastra: '/clubs/shastra.jpg',
  'marketing mavericks': '/clubs/marketing-mavericks.jpg',
  nexus: '/clubs/nexus.jpg',
  stratedge: '/clubs/stratedge.jpg',
  film: '/clubs/film.jpg',
  sristi: '/clubs/sristi.jpg',
};

export function clubCoverImage(clubName: string): string | null {
  const lower = clubName.toLowerCase();
  for (const [key, path] of Object.entries(CLUB_COVERS)) {
    if (lower.includes(key)) return path;
  }
  return null;
}
