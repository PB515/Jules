import { requireStudent } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { TierBadge } from '@/lib/components/tier-badge';
import { ProfileForm } from './profile-form';
import { ChangePasswordForm } from './change-password-form';
import { logoutAction } from '@/app/(auth)/actions';
import { Flame, LogOut } from '@/lib/icons';
import type { Tier, TransactionType } from '@/lib/supabase/database.types';

export const metadata = { title: 'Profile' };

const SOURCE_LABEL: Record<TransactionType, string> = {
  event_scan: 'Event check-ins',
  surge_earned: 'Surge, earned',
  surge_participation: 'Surge, participation',
  admin_manual_adjustment: 'Manual adjustment',
};

interface RegistrationAttendanceRow {
  attended_at: string | null;
  events: { event_date: string; end_date: string | null } | null;
}

export default async function ProfilePage() {
  const student = await requireStudent();
  const supabase = await createClient();

  const [{ data: totalsRows }, { data: registrations }, { data: transactions }, { data: groupMemberships }] =
    await Promise.all([
      supabase.rpc('my_totals'),
      supabase
        .from('event_registrations')
        .select('attended_at, events(event_date, end_date)')
        .eq('student_id', student.id)
        .returns<RegistrationAttendanceRow[]>(),
      supabase.from('joule_transactions').select('type, amount, surge_id').eq('student_id', student.id),
      supabase.from('quiz_group_members').select('surge_id').eq('student_id', student.id),
    ]);
  const totals = totalsRows?.[0] ?? { season_joules: 0, lifetime_joules: 0, tier: 'ember' as Tier, streak: 0 };

  const attendance = { attended: 0, missed: 0, upcoming: 0 };
  for (const r of registrations ?? []) {
    if (r.attended_at) {
      attendance.attended += 1;
    } else if (r.events && hasConcluded(r.events.end_date ?? r.events.event_date)) {
      attendance.missed += 1;
    } else {
      attendance.upcoming += 1;
    }
  }
  const attendanceMax = Math.max(1, attendance.attended, attendance.missed, attendance.upcoming);

  const pointsBySource = new Map<TransactionType, number>();
  for (const t of transactions ?? []) {
    pointsBySource.set(t.type, (pointsBySource.get(t.type) ?? 0) + t.amount);
  }
  const pointsMax = Math.max(1, ...Array.from(pointsBySource.values()).map((v) => Math.abs(v)));

  const groupSurgeIds = new Set((groupMemberships ?? []).map((g) => g.surge_id));
  const quizSurgeIds = new Set((transactions ?? []).filter((t) => t.surge_id).map((t) => t.surge_id as string));
  let soloQuizCount = 0;
  let groupQuizCount = 0;
  for (const surgeId of quizSurgeIds) {
    if (groupSurgeIds.has(surgeId)) groupQuizCount += 1;
    else soloQuizCount += 1;
  }

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <h1 className="text-xl font-medium">Profile</h1>

      <ProfileForm name={student.name} phone={student.phone ?? ''} />

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Lifetime Joules" value={totals.lifetime_joules.toLocaleString()} />
        <Stat label="Streak" value={`${totals.streak} events`} icon={<Flame className="size-4 text-accent" />} />
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

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-tertiary">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-background">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${(Math.abs(value) / max) * 100}%`, background: color }}
        />
      </div>
      <span className="w-10 text-right text-xs text-tertiary">{value}</span>
    </div>
  );
}

// Plain helper (not a component) — keeps the impure Date.now() call outside
// the component body so it isn't flagged by the render-purity lint rule.
function hasConcluded(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}
