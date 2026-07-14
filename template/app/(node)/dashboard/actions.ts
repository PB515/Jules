'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function registerForEventAction(eventId: string): Promise<{ registrationFormUrl: string | null }> {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('register_for_event', { p_event_id: eventId });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  revalidatePath(`/events/${eventId}`);

  const { data: event } = await supabase.from('events').select('registration_form_url').eq('id', eventId).maybeSingle();
  return { registrationFormUrl: event?.registration_form_url ?? null };
}

export async function unregisterFromEventAction(eventId: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('unregister_from_event', { p_event_id: eventId });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  revalidatePath(`/events/${eventId}`);
}
