import 'server-only';
/**
 * session.ts — server-side "who is this" helpers, built on the RLS-scoped
 * server client (never service-role). Every check here is redundant with RLS
 * by design (defense in depth): even if a route forgot to call these, the
 * database itself would still deny cross-user/cross-role reads and writes.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Tables, AdminRole } from '@/lib/supabase/database.types';

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getStudent(): Promise<Tables<'students'> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('students').select('*').eq('id', user.id).maybeSingle();
  return data;
}

export async function getAdmin(): Promise<Tables<'admins'> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('admins').select('*').eq('id', user.id).maybeSingle();
  return data;
}

/** Redirects to /login if not a signed-in student with a completed profile. */
export async function requireStudent(): Promise<Tables<'students'>> {
  const student = await getStudent();
  if (!student) redirect('/login');
  if (student.status === 'locked') redirect('/login?locked=1');
  return student;
}

/** Redirects to /admin/login unless signed in as an admin with (optionally) the given role(s). */
export async function requireAdmin(roles?: AdminRole[]): Promise<Tables<'admins'>> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  if (roles && !roles.includes(admin.role)) redirect('/admin');
  return admin;
}
