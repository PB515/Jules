import { requireStudent } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { TierBadge } from '@/lib/components/tier-badge';
import { ProfileForm } from './profile-form';
import { ChangePasswordForm } from './change-password-form';
import { logoutAction } from '@/app/(auth)/actions';
import { LogOut } from '@/lib/icons';
import { StreakChain } from '@/lib/components/streak-chain';
import { BarRow } from '@/lib/patterns/bar-row';
import { getStudentActivitySummary, SOURCE_LABEL } from '@/lib/jules/student-activity';
import type { Tier, TransactionType } from '@/lib/supabase/database.types';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const student = await requireStudent();
  const supabase = await createClient();

  const [{ data: totalsRows }, { attendance, pointsBySource, soloQuizCount, groupQuizCount }] = await Promise.all([
    supabase.rpc('my_totals'),
    getStudentActivitySummary(supabase, student.id),
  ]);
  const totals = totalsRows?.[0] ?? { season_joules: 0, lifetime_joules: 0, tier: 'ember' as Tier, streak: 0 };

  const attendanceMax = Math.max(1, attendance.attended, attendance.missed, attendance.upcoming);
  const pointsMax = Math.max(1, ...Array.from(pointsBySource.values()).map((v) => Math.abs(v)));

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <h1 className="text-xl font-medium">Profile</h1>

      <ProfileForm name={student.name} phone={student.phone ?? ''} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat label="Lifetime Joules" value={totals.lifetime_joules.toLocaleString()} />
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-xs text-muted">Streak</p>
          <div className="mt-2">
            <StreakChain count={totals.streak} />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card p-4">
        <span className="text-sm text-muted">Current tier</span>
        <TierBadge tier={totals.tier} />
      </section>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 text-sm text-tertiary">
        <p className="text-muted">College email</p>
        <p className="mt-1">{student.college_email}</p>
      </section>

      <section className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted">My activity</h2>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-tertiary">Event attendance</p>
          <BarRow label="Attended" value={attendance.attended} max={attendanceMax} color="var(--success)" />
          <BarRow label="Missed" value={attendance.missed} max={attendanceMax} color="var(--accent)" />
          <BarRow label="Upcoming" value={attendance.upcoming} max={attendanceMax} color="var(--border-muted)" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-tertiary">Joules by source</p>
          {pointsBySource.size === 0 ? (
            <p className="text-xs text-tertiary">No Joules earned yet.</p>
          ) : (
            (Object.keys(SOURCE_LABEL) as TransactionType[])
              .filter((type) => pointsBySource.has(type))
              .map((type) => (
                <BarRow
                  key={type}
                  label={SOURCE_LABEL[type]}
                  value={pointsBySource.get(type) ?? 0}
                  max={pointsMax}
                  color="var(--gold)"
                />
              ))
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-tertiary">Quiz participation</span>
          <span className="text-muted">
            {soloQuizCount} solo · {groupQuizCount} group
          </span>
        </div>
      </section>

      <ChangePasswordForm />

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-border py-3 text-sm text-muted"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-lg font-medium">
        {icon}
        {value}
      </p>
    </div>
  );
}

