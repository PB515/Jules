'use client';
/**
 * Client Component so the nav can highlight the active section via
 * usePathname() (no server-only calls here, so no split-out needed like
 * the admin sidebar). Kumkum ("you are here") reuses Live Round's own
 * identity meaning (decision 39), not a new per-section color.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/lib/site';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/afterglow', label: 'Afterglow' },
  { href: '/gallery', label: 'Gallery' },
] as const;

export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-medium tracking-tight text-gold">
            {site.name}
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted">
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-border bg-card px-6 py-6 text-center text-xs text-tertiary">
        {site.name}: {site.tagline}
      </footer>
    </div>
  );
}
