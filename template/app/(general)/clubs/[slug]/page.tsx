import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Instagram, Linkedin, ExternalLink, Users } from '@/lib/icons';
import { EmptyState } from '@/lib/patterns/empty-state';

export const metadata = { title: 'Club' };

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: clubs } = await supabase.rpc('public_clubs');
  const club = (clubs ?? []).find((c) => c.slug === slug);
  if (!club) notFound();

  const { data: events } = await supabase.rpc('public_events');
  const clubEvents = (events ?? [])
    .filter((e) => e.club_name === club.name && new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 5);

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
        {clubEvents.length === 0 ? (
          <EmptyState icon={Users} title="Nothing scheduled yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {clubEvents.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                {e.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
