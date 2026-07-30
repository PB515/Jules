import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStudent, getAdmin } from '@/lib/auth/session';
import { site } from '@/lib/site';
import { EmptyState } from '@/lib/patterns/empty-state';
import { HeroCarousel } from '@/lib/components/hero-carousel';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { ArrowRight, Calendar, MapPin, Briefcase, Network, Crown, Lightbulb, HeartHandshake } from '@/lib/icons';

const PILLARS = [
  { icon: Briefcase, label: 'Professional', color: 'text-adani-teal' },
  { icon: Network, label: 'Networking', color: 'text-adani-blue' },
  { icon: Crown, label: 'Leadership', color: 'text-amber-500' },
  { icon: Lightbulb, label: 'Industry Insights', color: 'text-adani-violet' },
  { icon: HeartHandshake, label: 'Societal Impact', color: 'text-success' },
] as const;

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
      {/* Full-bleed 100vh split hero — breaks out of the shared <main>'s
          max-w-5xl/px-6/py-10 constraints via the standard "50vw" full-bleed
          technique, since a wall-to-wall hero can't live inside a
          centered/padded container. */}
      <section className="relative left-1/2 -mx-[50vw] -mt-10 flex h-[calc(100vh-100px)] w-screen items-stretch overflow-hidden border-b border-border bg-white">
        <div className="grid w-full grid-cols-1 items-stretch lg:grid-cols-12">
          <div className="flex flex-col justify-center gap-4 py-8 pr-6 pl-6 lg:col-span-7 lg:pr-12 lg:pl-24">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-slate px-3 py-1 shadow-2xs">
              <span className="size-2 animate-pulse rounded-full bg-adani-teal" aria-hidden />
              <span className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">Faculty of Management Sciences (FMS)</span>
            </div>

            <h1 className="max-w-2xl text-3xl leading-[1.1] font-black text-slate-900 sm:text-5xl">
              Progress, <span className="text-adani-gradient">Together.</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600">{site.description}</p>

            <div className="grid max-w-md grid-cols-3 gap-3 pt-0.5">
              <div className="rounded-xl border border-border bg-surface-slate p-2.5 text-center">
                <p className="text-xl font-black text-gold">9</p>
                <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">FMS Clubs</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-slate p-2.5 text-center">
                <p className="text-xl font-black text-adani-teal">4</p>
                <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">Standing Tiers</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-slate p-2.5 text-center">
                <p className="text-xl font-black text-adani-blue">100%</p>
                <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">SOP Verified</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {student ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-adani-gradient px-6 py-3 text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(0,140,168,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue to your Grid
                </Link>
              ) : admin ? (
                <Link
                  href="/admin"
                  className="rounded-full bg-adani-gradient px-6 py-3 text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(0,140,168,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue to the Command Center
                </Link>
              ) : (
                <Link
                  href="/get-app"
                  className="flex items-center gap-2 rounded-full bg-adani-gradient px-6 py-3 text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(0,140,168,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  I&apos;m an MBA Student <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:col-span-5 lg:block lg:pt-10 lg:pr-6">
            <HeroCarousel />
          </div>
        </div>
      </section>

      {/* Message from the Faculty Chair */}
      <section className="space-y-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-xl sm:p-10">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-700/80 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-gold/90 text-xl font-black text-white shadow-md">
              RM
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Dr. Riya Mehta</h3>
              <p className="text-xs font-medium text-slate-300">Faculty Chair, Faculty of Management Sciences (FMS)</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 shadow-2xs">FMS Official SOP</span>
        </div>

        <blockquote className="text-sm leading-relaxed font-normal text-slate-200 italic sm:text-base">
          &ldquo;The FMS Students Clubs and Conduits offer more than mere student organizations; they form a
          vibrant community where ambitious minds converge to explore, learn, and foster professional growth.
          Becoming a member grants you exclusive access to networking opportunities, skill development, and
          leadership training.&rdquo;
        </blockquote>

        <div className="grid grid-cols-2 gap-3.5 pt-2 sm:grid-cols-5">
          {PILLARS.map(({ icon: Icon, label, color }) => (
            <div key={label} className="space-y-1.5 rounded-2xl border border-slate-700/60 bg-slate-800/80 p-3 text-center">
              <Icon className={`mx-auto size-4 ${color}`} aria-hidden />
              <p className="text-xs font-bold text-slate-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">The idea</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          The FMS Students Clubs and Conduits are more than student organizations. They&apos;re a vibrant
          community where ambitious minds converge to explore, learn, and grow professionally. Every meeting,
          expert session, volunteer task, and live quiz across every club earns Synergy Points, building one shared,
          permanent record of participation in Catalyst Records, a single points system shared across every
          club, not one per club. Members climb through standing tiers (Ember, Volt, Current, Plasma) as they
          engage: networking with peers, faculty, alumni, and industry professionals; building leadership
          skills through hands-on event management; and gaining real industry insight through guest lectures,
          case studies, and site visits.
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
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-background">
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    {e.location ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-tertiary">
                        <MapPin className="size-3" aria-hidden />
                        {e.location}
                      </p>
                    ) : null}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs">
                    <Calendar className="size-3.5 text-muted" aria-hidden />
                    <span className="text-muted">{formatDateUTC(e.event_date)}</span>
                    <span className="font-medium text-accent">{formatTimeUTC(e.event_date)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
