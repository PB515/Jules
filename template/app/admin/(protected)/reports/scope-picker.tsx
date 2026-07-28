'use client';
/**
 * Same `useRouter().push(...)?param=` pattern as every other picker in
 * this app (catalyst/season-picker.tsx, ledger/ledger-event-picker.tsx).
 * Two independent params (season, club) that both need to survive when
 * the other one changes, so this owns both selects together rather than
 * being two separate single-param pickers that would clobber each other.
 */
import { useRouter } from 'next/navigation';

interface SeasonOption {
  id: string;
  label: string;
}
interface ClubOption {
  id: string;
  name: string;
}

export function ScopePicker({
  seasons,
  clubs,
  selectedSeason,
  selectedClub,
  isSuperAdmin,
}: {
  seasons: SeasonOption[];
  clubs: ClubOption[];
  selectedSeason: string;
  selectedClub: string;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();

  function push(season: string, club: string) {
    const params = new URLSearchParams();
    if (season) params.set('season', season);
    if (club) params.set('club', club);
    router.push(`/admin/reports${params.size ? `?${params}` : ''}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <select className="input" value={selectedSeason} onChange={(e) => push(e.target.value, selectedClub)}>
        <option value="">All time</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {isSuperAdmin ? (
        <select className="input" value={selectedClub} onChange={(e) => push(selectedSeason, e.target.value)}>
          <option value="">All clubs</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
