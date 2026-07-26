'use client';
/**
 * Active-route highlighting for the bottom tab bar — needs usePathname(),
 * so it's split out as its own Client Component, same pattern as the admin
 * sidebar's admin-nav-client.tsx (decision 40). Unlike the admin nav, every
 * student sees the same 5 tabs, so there's no role-filtering to thread down.
 */
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ScanLine, Trophy, User, MonitorPlay } from '@/lib/icons';

const NAV = [
  { href: '/dashboard', label: 'Grid', icon: Home },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/live', label: 'Live', icon: MonitorPlay },
  { href: '/catalyst', label: 'Records', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export function NodeNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? 'text-accent' : 'text-tertiary hover:text-gold'
              }`}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
