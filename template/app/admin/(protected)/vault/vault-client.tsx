'use client';
/**
 * Student Data Vault (spec §7) — Owner only. Search, Force Reset (temp
 * password, audit-logged), manual Joule adjustment, lock/unlock.
 */
import { useMemo, useState, useTransition } from 'react';
import { TierBadge } from '@/lib/components/tier-badge';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Search, Lock, Unlock, KeyRound } from '@/lib/icons';
import { adjustJoulesAction, forceResetAction, setStudentStatusAction } from './actions';
import type { Tier, StudentStatus } from '@/lib/supabase/database.types';

interface StudentRow {
  id: string;
  name: string;
  college_email: string;
  phone: string | null;
  status: StudentStatus;
  streak_days: number;
  season_joules: number;
  lifetime_joules: number;
  tier: Tier;
}

export function VaultClient({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.college_email.toLowerCase().includes(q));
  }, [students, query]);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 rounded-[var(--radius)] border border-border-muted bg-card px-3 py-2">
        <Search className="size-4 text-tertiary" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={students.length === 0 ? 'No students yet' : 'No matches'}
          message={students.length === 0 ? 'Students appear here once they sign up.' : 'Try a different name or email.'}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{s.name}</span>
                  {s.status === 'locked' ? <Lock className="size-3.5 text-accent" aria-label="Locked" /> : null}
                </div>
                <div className="flex items-center gap-2">
                  <TierBadge tier={s.tier} />
                  <span className="text-xs text-tertiary">{s.season_joules} J</span>
                </div>
              </button>
              {expanded === s.id ? <StudentDetail student={s} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentDetail({ student }: { student: StudentRow }) {
  const [isPending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  function doForceReset() {
    if (!confirm(`Issue a temporary password for ${student.name}?`)) return;
    startTransition(async () => {
      const res = await forceResetAction(student.id);
      if (res.error) setError(res.error);
      else setTempPassword(res.tempPassword ?? null);
    });
  }

  function doAdjust() {
    const n = parseInt(amount, 10);
    if (!n) return setError('Enter a non-zero whole number.');
    startTransition(async () => {
      const res = await adjustJoulesAction(student.id, n, reason);
      if (res.error) setError(res.error);
      else {
        setAmount('');
        setReason('');
        setError(null);
      }
    });
  }

  function toggleLock() {
    startTransition(async () => {
      await setStudentStatusAction(student.id, student.status === 'active' ? 'locked' : 'active');
    });
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border bg-background/40 px-4 py-4 text-sm">
      <div className="grid grid-cols-2 gap-2 text-xs text-muted">
        <p>Email: {student.college_email}</p>
        <p>Phone: {student.phone ?? 'n/a'}</p>
        <p>Lifetime Joules: {student.lifetime_joules}</p>
        <p>Streak: {student.streak_days} days</p>
      </div>

      {error ? <p className="text-accent">{error}</p> : null}
      {tempPassword ? (
        <p className="rounded-[var(--radius)] border border-gold/40 bg-card p-2 font-mono text-xs text-gold">
          Temp password: {tempPassword} (relay to the student now, it won&apos;t be shown again)
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          placeholder="± Joules"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input w-28"
        />
        <input
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input flex-1"
        />
        <button onClick={doAdjust} disabled={isPending} className="rounded-[var(--radius)] bg-gold px-3 py-2 text-xs font-medium text-gold-foreground">
          Adjust
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={doForceReset}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-2 text-xs text-muted"
        >
          <KeyRound className="size-3.5" aria-hidden />
          Force Reset
        </button>
        <button
          onClick={toggleLock}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-2 text-xs text-muted"
        >
          {student.status === 'active' ? <Lock className="size-3.5" aria-hidden /> : <Unlock className="size-3.5" aria-hidden />}
          {student.status === 'active' ? 'Lock account' : 'Unlock account'}
        </button>
      </div>
    </div>
  );
}
