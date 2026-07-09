import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { ScanClient } from './scan-client';

export const metadata = { title: 'Scan' };

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  await requireStudent();
  const { e, t } = await searchParams;
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('events')
    .select('id, name, type, joule_value')
    .neq('type', 'surge')
    .order('event_date', { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <h1 className="text-xl font-medium">Scan event QR</h1>
      <ScanClient initialEventId={e ?? ''} initialToken={(t ?? '').toUpperCase()} events={events ?? []} />
    </div>
  );
}
