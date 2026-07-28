import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { NotificationsList } from './notifications-list';
import { Bell } from '@/lib/icons';

export const metadata = { title: 'Notifications' };

// Most recent 50, no pagination in this pass — a deliberate scoping
// choice to ship this quickly; worth real pagination later if volume
// ever warrants it (matches the pattern already used in catalyst/page.tsx
// if that becomes necessary).
const RECENT_LIMIT = 50;

export default async function NotificationsPage() {
  const student = await requireStudent();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, url, read_at, created_at')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <h1 className="text-xl font-medium">Notifications</h1>
      {!notifications || notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing yet" message="New events and updates on events you've registered for will show up here." />
      ) : (
        <NotificationsList notifications={notifications} />
      )}
    </div>
  );
}
