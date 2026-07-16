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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-medium tracking-tight text-gold">
            {site.name}
          </Link>

          {isStudent ? (
            // Reached from inside the installed Node app (e.g. tapping an event on
            // the Dashboard) — no nav-away menu here, just one clear way back in,
            // rather than inviting a mid-task detour through the public marketing site.
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-accent">
              <ArrowLeft className="size-4" aria-hidden />
              Back to Grid
            </Link>
          ) : (
            <>
              <nav className="hidden items-center gap-5 text-sm text-muted sm:flex">
                {NAV.map((item) => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? 'border-b-2 border-accent pb-0.5 text-accent' : 'border-b-2 border-transparent pb-0.5 hover:text-foreground'}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/get-app"
                  className="rounded-[var(--radius)] bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground"
                >
                  Get the App
                </Link>
              </nav>

              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="flex size-9 items-center justify-center rounded-[var(--radius)] text-muted sm:hidden"
              >
                {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              </button>
            </>
          )}
        </div>

        {!isStudent && menuOpen ? (
          <nav className="flex flex-col gap-1 border-t border-border px-6 py-3 text-sm sm:hidden">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-[var(--radius)] px-3 py-2.5 ${active ? 'bg-background text-accent' : 'text-muted'}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/get-app"
              onClick={() => setMenuOpen(false)}
              className="mt-1 rounded-[var(--radius)] bg-gold px-3 py-2.5 text-center text-xs font-medium text-gold-foreground"
            >
              Get the App
            </Link>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-border bg-card px-6 py-10 text-xs text-tertiary">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
            <div className="flex flex-col gap-4">
              <Image src="/brand/adani-university-logo.png" alt="Adani University" width={330} height={176} className="h-12 w-[63px]" />
              <div className="flex items-center gap-2.5">
                <Image src="/icons/icon.svg" alt="" width={36} height={36} className="size-9" />
                <span className="text-lg font-medium tracking-tight text-foreground">{site.name}</span>
              </div>
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
