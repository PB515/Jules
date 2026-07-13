import { requireStudent } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { TierBadge } from '@/lib/components/tier-badge';
import { AvatarSceneLoader } from '@/lib/components/avatar-3d/avatar-scene-loader';
import { ProfileDemoControls } from '@/lib/components/avatar-3d/profile-demo-controls';
import { ProfileForm } from './profile-form';
import { logoutAction } from '@/app/(auth)/actions';
import { Flame, LogOut } from '@/lib/icons';
import type { Tier } from '@/lib/supabase/database.types';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const student = await requireStudent();
  const supabase = await createClient();
  const [{ data: totalsRows }, { data: avatarItems }] = await Promise.all([
    supabase.rpc('my_totals'),
    supabase.rpc('avatar_items_catalog'),
  ]);
  const totals = totalsRows?.[0] ?? { season_joules: 0, lifetime_joules: 0, tier: 'ember' as Tier, streak_days: 0 };

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <h1 className="text-xl font-medium">Profile</h1>

      <AvatarSceneLoader tier={totals.tier} />
      <ProfileDemoControls avatarItems={avatarItems ?? []} initialLifetimeJoules={totals.lifetime_joules} />

      <ProfileForm name={student.name} phone={student.phone ?? ''} />

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Lifetime Joules" value={totals.lifetime_joules.toLocaleString()} />
        <Stat label="Streak" value={`${totals.streak_days} days`} icon={<Flame className="size-4 text-accent" />} />
      </section>

      <section className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card p-4">
        <span className="text-sm text-muted">Current tier</span>
        <TierBadge tier={totals.tier} />
      </section>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 text-sm text-tertiary">
        <p className="text-muted">College email</p>
        <p className="mt-1">{student.college_email}</p>
      </section>

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
