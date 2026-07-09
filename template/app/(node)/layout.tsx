import Link from 'next/link';
import { requireStudent } from '@/lib/auth/session';
import { Home, ScanLine, Trophy, User, MonitorPlay } from '@/lib/icons';

const NAV = [
  { href: '/dashboard', label: 'Grid', icon: Home },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/live', label: 'Live', icon: MonitorPlay },
  { href: '/catalyst', label: 'Records', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export default async function NodeLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-20">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-tertiary transition-colors hover:text-gold"
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px]">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
