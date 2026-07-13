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
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ScanLine, Zap, BarChart3, Users, Settings, MonitorPlay, BookOpen, ImageIcon } from '@/lib/icons';

const NAV = [
  { href: '/admin/grid', label: 'Grid Station', icon: ScanLine, roles: ['professor', 'committee_member'] },
  { href: '/admin/surges', label: 'Surge Builder', icon: Zap, roles: ['professor', 'committee_member'] },
  { href: '/admin/live/new', label: 'Live Round', icon: MonitorPlay, roles: ['professor', 'committee_member'] },
  { href: '/admin/ledger', label: 'System Ledger', icon: BarChart3, roles: ['professor', 'committee_member'] },
  { href: '/admin/event-reports', label: 'Event Reports', icon: BookOpen, roles: ['professor', 'committee_member'] },
  { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon, roles: ['professor', 'committee_member'] },
  { href: '/admin/vault', label: 'Student Vault', icon: Users, roles: ['professor'] },
  { href: '/admin/settings', label: 'Settings', icon: Settings, roles: ['professor'] },
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
