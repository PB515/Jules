/**
 * Shared event_registrations -> students query, used by the Professor's
 * live registrations dashboard (app/admin/(protected)/grid/[eventId]/
 * registrations/) AND, later, the Event Report .docx roster table (Phase
 * 3) — one helper so the two can never drift apart from each other. Takes
 * a plain Supabase client (server or browser both expose the same `.from`
 * surface) rather than a specific client type, since this is called from
 * both a Server Component (initial fetch) and a Client Component (realtime
 * refetch).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export interface EventRegistrationRow {
  id: string;
  student_id: string;
  registered_at: string;
  attended_at: string | null;
  role: 'participant' | 'volunteer';
  name: string;
  college_email: string;
  phone: string | null;
}

export async function getEventRegistrations(
  supabase: SupabaseClient<Database>,
  eventId: string
): Promise<EventRegistrationRow[]> {
  const { data } = await supabase
    .from('event_registrations')
    .select('id, student_id, registered_at, attended_at, role, students(name, college_email, phone)')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    student_id: r.student_id,
    registered_at: r.registered_at,
    attended_at: r.attended_at,
    role: r.role,
    name: r.students?.name ?? 'Unknown',
    college_email: r.students?.college_email ?? '',
    phone: r.students?.phone ?? null,
  }));
}

/** Rows bucketed by UTC hour, oldest first — the live-registrations sparkline's data shape. */
export function bucketRegistrationsByHour(rows: EventRegistrationRow[]): { hour: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.registered_at);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([hour, count]) => ({ hour, count }));
}
