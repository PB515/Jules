import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { Instagram, Linkedin, ExternalLink, Users, Calendar, MapPin } from '@/lib/icons';
import { EmptyState } from '@/lib/patterns/empty-state';

export const metadata = { title: 'Club' };

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: clubs }, { data: events }] = await Promise.all([
    supabase.rpc('public_clubs'),
    supabase.rpc('public_events'),
  ]);
  const club = (clubs ?? []).find((c) => c.slug === slug);
  if (!club) notFound();

  const now = new Date();
  const clubEvents = (events ?? []).filter((e) => e.club_name === club.name);
  const upcoming = clubEvents
    .filter((e) => new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const past = clubEvents
    .filter((e) => new Date(e.event_date) < now)
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  const socials = [
    club.instagram_url ? { href: club.instagram_url, label: 'Instagram', icon: Instagram } : null,
    club.linkedin_url ? { href: club.linkedin_url, label: 'LinkedIn', icon: Linkedin } : null,
    club.x_url ? { href: club.x_url, label: 'X', icon: ExternalLink } : null,
  ].filter((s): s is { href: string; label: string; icon: typeof Instagram } => s !== null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-medium">{club.name}</h1>
        {club.description ? <p className="mt-2 text-sm text-muted">{club.description}</p> : null}
      </div>

      {socials.length > 0 ? (
        <div className="flex gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-xs text-muted hover:text-gold"
            >
              <s.icon className="size-3.5" aria-hidden />
              {s.label}
            </a>
          ))}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Upcoming events</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={Users} title="Nothing scheduled yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-background">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{e.name}</p>
                    {e.location ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-tertiary">
                        <MapPin className="size-3" aria-hidden />
                        {e.location}
                      </p>
                    ) : null}
                  </div>
                  <p className="flex shrink-0 items-center gap-1.5 text-xs">
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

      {past.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Past events</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="flex w-56 shrink-0 flex-col gap-1 rounded-[var(--radius)] border border-border bg-card p-4 hover:border-gold/50"
              >
                <p className="truncate text-sm font-medium">{e.name}</p>
                {e.location ? (
                  <p className="flex items-center gap-1 text-xs text-tertiary">
                    <MapPin className="size-3" aria-hidden />
                    {e.location}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted">{formatDateUTC(e.event_date)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
