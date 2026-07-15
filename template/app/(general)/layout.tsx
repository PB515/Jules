'use client';
/**
 * Client Component so the nav can highlight the active section via
 * usePathname() (no server-only calls here, so no split-out needed like
 * the admin sidebar). Kumkum ("you are here") reuses Live Round's own
 * identity meaning (decision 39), not a new per-section color.
 */
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { site } from '@/lib/site';
import { Menu, X } from '@/lib/icons';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/event-reports', label: 'Event Reports' },
  { href: '/clubs', label: 'Clubs' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/gallery', label: 'Gallery' },
] as const;

export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-medium tracking-tight text-gold">
            {site.name}
          </Link>

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
        </div>

        {menuOpen ? (
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

      <footer className="flex flex-col items-center gap-2 border-t border-border bg-card px-6 py-6 text-center text-xs text-tertiary">
        <Image src="/brand/adani-university-logo.png" alt="Adani University" width={110} height={59} className="h-6 w-auto" />
        <p>
          {site.name}: {site.tagline}
        </p>
        <Link href="/clubs" className="text-gold">
          Browse clubs
        </Link>
      </footer>
    </div>
  );
}
