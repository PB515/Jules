'use client';
/**
 * Active-route highlighting for the sidebar — needs usePathname(), so it's
 * split out as its own Client Component. Owns the full nav array (including
 * icon components) itself and filters by the plain `role` string passed
 * down, rather than receiving pre-built items containing icon components:
 * a Lucide icon reference isn't a plain serializable value, so it can't
 * cross the Server->Client prop boundary (confirmed live — Next.js throws
 * "Only plain objects can be passed to Client Components from Server
 * Components" if you try). Kumkum ("you are here") reuses Live Round's own
 * identity meaning (decision 39), not a new per-section color.
 */
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ScanLine, Zap, BarChart3, Users, Settings, MonitorPlay, BookOpen, ImageIcon, Smartphone, ShieldAlert, Menu, X } from '@/lib/icons';

const NAV = [
  { href: '/admin/grid', label: 'Grid Station', icon: ScanLine, roles: ['professor', 'committee_member', 'super_admin'] },
  { href: '/admin/surges', label: 'Surge Builder', icon: Zap, roles: ['professor', 'committee_member', 'super_admin'] },
  // Live Round hosting is Professor/Super Admin only, same reasoning as
  // the QR/scanner restriction — Committee Member's job is event creation
  // + Event Report writing, not running a live activity.
  { href: '/admin/live/new', label: 'Live Round', icon: MonitorPlay, roles: ['professor', 'super_admin'] },
  { href: '/admin/ledger', label: 'System Ledger', icon: BarChart3, roles: ['professor', 'committee_member', 'super_admin'] },
  { href: '/admin/event-reports', label: 'Event Reports', icon: BookOpen, roles: ['professor', 'committee_member', 'super_admin'] },
  { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon, roles: ['professor', 'committee_member', 'super_admin'] },
  { href: '/admin/vault', label: 'Student Vault', icon: Users, roles: ['super_admin'] },
  { href: '/admin/audit', label: 'Audit Log', icon: ShieldAlert, roles: ['super_admin'] },
  { href: '/admin/settings', label: 'Settings', icon: Settings, roles: ['super_admin'] },
  { href: '/admin/get-app', label: 'Get the App', icon: Smartphone, roles: ['professor', 'committee_member', 'super_admin'] },
] as const;

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const nav = NAV.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-sm ${
              active
                ? 'border-l-2 border-accent bg-background text-accent'
                : 'border-l-2 border-transparent text-muted hover:bg-background hover:text-foreground'
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The mobile admin header (admin/(protected)/layout.tsx) had NO navigation
 * at all below the `sm:` breakpoint — the sidebar is hidden and the header
 * only ever had a title + Log out. Confirmed live, blocking a real
 * Committee Member from reaching Event Reports on a real phone. A
 * hamburger toggle reusing the same NAV array/role-filter as the desktop
 * sidebar, rather than a second nav definition that could drift.
 */
export function MobileAdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = NAV.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex size-11 items-center justify-center text-muted hover:text-foreground"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open ? (
        <nav className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b border-border bg-card p-3 shadow-lg">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex min-h-11 items-center gap-2.5 rounded-[var(--radius)] px-3 text-sm ${
                  active
                    ? 'border-l-2 border-accent bg-background text-accent'
                    : 'border-l-2 border-transparent text-muted hover:bg-background hover:text-foreground'
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
