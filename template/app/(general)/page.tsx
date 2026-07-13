import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStudent, getAdmin } from '@/lib/auth/session';
import { site } from '@/lib/site';
import { EmptyState } from '@/lib/patterns/empty-state';
import { EnergyField } from '@/lib/components/energy-field';
import { HeroAtom } from '@/lib/components/hero-atom';
import { ArrowRight, Calendar, MapPin } from '@/lib/icons';

export const metadata = { title: 'Home' };

export default async function GeneralHomePage() {
  const [student, admin] = await Promise.all([getStudent(), getAdmin()]);

  const supabase = await createClient();
  const { data: events } = await supabase.rpc('public_events');
  const upcoming = (events ?? [])
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 3);

  return (
    <div className="relative z-10 flex flex-col gap-16">
      <EnergyField />

      <section className="relative isolate flex flex-col items-center gap-4 py-10 text-center">
        <HeroAtom className="absolute inset-0 -z-10 opacity-10" />
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Energy Management Club</p>
        <h1 className="max-w-2xl text-4xl leading-tight font-medium">{site.tagline}</h1>
        <p className="max-w-xl text-muted">{site.description}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {student ? (
            <Link href="/dashboard" className="rounded-[var(--radius)] bg-gold px-5 py-2.5 text-sm font-medium text-gold-foreground">
              Continue to your Grid
            </Link>
          ) : admin ? (
            <Link href="/admin" className="rounded-[var(--radius)] bg-gold px-5 py-2.5 text-sm font-medium text-gold-foreground">
              Continue to the Command Center
            </Link>
          ) : (
            <>
              <Link href="/get-app" className="flex items-center gap-1.5 rounded-[var(--radius)] bg-gold px-5 py-2.5 text-sm font-medium text-gold-foreground">
                I&apos;m a student <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/admin/login" className="rounded-[var(--radius)] border border-border px-5 py-2.5 text-sm text-muted hover:text-foreground">
                I&apos;m an admin
              </Link>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">The idea</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Synergy bridges the Joule, the SI unit of energy, with Shakti, the primordial energy that the
          Vishwambhari Stuti describes as present in every atom of the universe. Every meeting, expert
          session, volunteer task, and live quiz across every club is a spark of that energy. Members are
          atoms of the program, generating Joules through engagement, climbing through standing energy
          states (Ember, Volt, Current, Plasma), and building one shared permanent record of participation
          in Catalyst Records, a single points system shared across every club, not one per club.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Upcoming events</h2>
          <Link href="/events" className="text-sm text-gold">
            See all
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon={Calendar} title="Nothing scheduled yet" message="Check back soon." />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  {e.location ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-tertiary">
                      <MapPin className="size-3" aria-hidden />
                      {e.location}
                    </p>
                  ) : null}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Calendar className="size-3.5" aria-hidden />
                  {new Date(e.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
