'use client';
/**
 * Client Component so the nav can highlight the active section via
 * usePathname() (no server-only calls here, so no split-out needed like
 * the admin sidebar). Kumkum ("you are here") reuses Live Round's own
 * identity meaning (decision 39), not a new per-section color.
 *
 * Receives the club list as a plain prop from the Server Component layout
 * (own component owns the nav array itself, decision 40 — never pass a
 * fetch/RPC call across the client boundary, only plain serializable data).
 *
 * Header rebuilt to match the finalized public site prototype: a floating
 * pill navbar with the real Adani University logo + the real Canva Synergy
 * wordmark (both synced into public/images/), replacing the earlier plain
 * flex-row header. The homepage's admin/staff CTA is deliberately NOT
 * restored here — the earlier removal (decision 65) was the user's own
 * public-facing security call ("no reason to advertise a staff login
 * button next to the student one"), re-confirmed when this rebuild started;
 * "Staff login" stays a small footer link only.
 */
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { site } from '@/lib/site';
import { Menu, X, Instagram, Download, ArrowLeft } from '@/lib/icons';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/event-reports', label: 'Event Reports' },
  { href: '/clubs', label: 'Clubs' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/gallery', label: 'Gallery' },
] as const;

interface FooterClub {
  id: string;
  name: string;
  slug: string;
  instagram_url: string | null;
}

export function GeneralLayoutClient({
  children,
  clubs,
  isStudent,
}: {
  children: React.ReactNode;
  clubs: FooterClub[];
  isStudent: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex items-center justify-between rounded-full border border-border bg-card/95 px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image src="/images/official_adani_university_logo.png" alt="Adani University" width={1024} height={345} className="h-8 w-auto object-contain" priority />
            <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
            <Image
              src="/images/synergy_combination_wordmark_cropped.png"
              alt={site.name}
              width={1045}
              height={349}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>

          {isStudent ? (
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-accent">
              <ArrowLeft className="size-4" aria-hidden />
              Back to Grid
            </Link>
          ) : (
            <>
              <nav className="hidden items-center gap-6 font-heading text-xs font-semibold text-muted md:flex">
                {NAV.map((item) => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? 'border-b-2 border-accent pb-0.5 font-extrabold text-accent' : 'border-b-2 border-transparent pb-0.5 hover:text-foreground'}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-3">
                <Link
                  href="/get-app"
                  className="bg-adani-gradient hidden shrink-0 rounded-full px-5 py-2.5 font-heading text-xs font-extrabold text-white shadow-[0_4px_14px_rgba(0,140,168,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] sm:inline-block"
                >
                  Install App / Login
                </Link>

                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={menuOpen}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted md:hidden"
                >
                  {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
                </button>
              </div>
            </>
          )}
        </div>

        {!isStudent && menuOpen ? (
          <nav className="mt-2 flex flex-col gap-1 rounded-3xl border border-border bg-card/95 p-3 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-[var(--radius)] px-3 py-2.5 ${active ? 'bg-surface-slate text-accent' : 'text-muted'}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/get-app"
              onClick={() => setMenuOpen(false)}
              className="bg-adani-gradient mt-1 rounded-[var(--radius)] px-3 py-2.5 text-center text-xs font-extrabold text-white"
            >
              Install App / Login
            </Link>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-border bg-card px-6 py-10 text-xs text-tertiary">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
            <div className="flex flex-col gap-4">
              <Image src="/images/official_adani_university_logo.png" alt="Adani University" width={1024} height={345} className="h-12 w-auto object-contain" />
              <Image
                src="/images/synergy_combination_wordmark_cropped.png"
                alt={site.name}
                width={1045}
                height={349}
                className="h-9 w-auto object-contain"
              />
              <p className="max-w-xs text-tertiary">{site.description}</p>
              <Link
                href="/get-app"
                className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius)] bg-gold px-4 py-2 text-xs font-medium text-gold-foreground"
              >
                <Download className="size-3.5" aria-hidden />
                Install the App
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-medium text-foreground">Pages</p>
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-gold">
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-medium text-foreground">Clubs</p>
              {clubs.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Link href={`/clubs/${c.slug}`} className="hover:text-gold">
                    {c.name}
                  </Link>
                  {c.instagram_url ? (
                    <a href={c.instagram_url} target="_blank" rel="noopener noreferrer" aria-label={`${c.name} on Instagram`} className="text-tertiary hover:text-gold">
                      <Instagram className="size-3" aria-hidden />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-border pt-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p>{site.legalName}</p>
            <p>{site.tagline}</p>
            <Link href="/admin/login" className="text-tertiary hover:text-muted">
              Staff login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
