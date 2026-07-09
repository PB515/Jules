'use client';

import { useRouter } from 'next/navigation';

interface SeasonOption {
  id: string;
  label: string;
}

export function SeasonPicker({ seasons, selected }: { seasons: SeasonOption[]; selected: string }) {
  const router = useRouter();
  return (
    <select
      className="input"
      value={selected}
      onChange={(e) => router.push(`/catalyst?season=${e.target.value}`)}
    >
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
