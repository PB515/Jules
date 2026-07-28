'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { markNotificationReadAction } from './actions';
import { Bell } from '@/lib/icons';
import { formatDateUTC } from '@/lib/jules/format-date';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function open(n: NotificationRow) {
    startTransition(async () => {
      if (!n.read_at) await markNotificationReadAction(n.id);
      if (n.url) router.push(n.url);
    });
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
      {notifications.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => open(n)}
            disabled={pending}
            className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-background disabled:opacity-60"
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-slate">
              <Bell className={`size-4 ${n.read_at ? 'text-tertiary' : 'text-gold'}`} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`flex items-center gap-1.5 text-sm ${n.read_at ? 'text-muted' : 'font-medium text-foreground'}`}>
                {!n.read_at ? <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden /> : null}
                {n.title}
              </span>
              <span className="mt-0.5 block text-xs text-tertiary">{n.body}</span>
            </span>
            <span className="shrink-0 text-xs text-tertiary">{formatDateUTC(n.created_at)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
