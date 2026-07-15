'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { rateLimit, clientIp } from '@/lib/security';
import { headers } from 'next/headers';
import { site } from '@/lib/site';

export interface ActionResult {
  error?: string;
}

export async function signupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!name || !email || !phone || !password) {
    return { error: 'Fill in every field to connect.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const ip = clientIp(await headers());
  if (!rateLimit(`signup:${ip}`, 8, 60_000).ok) {
    return { error: 'Too many attempts. Try again in a minute.' };
  }

  const supabase = await createClient();

  // Fail fast before creating an auth user at all if the domain is not allowed.
  const { data: allowed, error: domainErr } = await supabase.rpc('is_email_domain_allowed', {
    p_email: email,
  });
  if (domainErr) return { error: 'Could not verify college email domain. Try again.' };
  if (!allowed) {
    return { error: 'That email domain is not recognized for this club yet. Use your college email.' };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone } },
  });
  if (signUpError) return { error: signUpError.message };
  if (!signUpData.user) {
    return { error: 'Check your college email to confirm your account, then log in.' };
  }

  const { error: onboardError } = await supabase.rpc('complete_onboarding', {
    p_name: name,
    p_phone: phone,
  });
  if (onboardError) return { error: onboardError.message };

  redirect(safeNext(formData.get('next')));
}

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === 'string' ? next : '';
  // Only ever redirect within the app — never to an absolute/external URL.
  return s.startsWith('/') && !s.startsWith('//') ? s : '/dashboard';
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}:${email}`, 8, 60_000).ok) {
    return { error: 'Too many attempts. Try again in a minute.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Incorrect email or password.' };

  const { data: student } = await supabase.from('students').select('id').eq('id', data.user.id).maybeSingle();
  if (!student) {
    await supabase.auth.signOut();
    return { error: 'This account has no student access. Admins log in at /admin/login.' };
  }

  redirect(safeNext(formData.get('next')));
}

export async function adminLoginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const ip = clientIp(await headers());
  if (!rateLimit(`admin-login:${ip}:${email}`, 8, 60_000).ok) {
    return { error: 'Too many attempts. Try again in a minute.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Incorrect email or password.' };

  const { data: admin } = await supabase.from('admins').select('id').eq('id', data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: 'This account has no admin access.' };
  }

  redirect('/admin');
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'Enter your college email.' };

  const ip = clientIp(await headers());
  if (!rateLimit(`forgot:${ip}:${email}`, 5, 60_000).ok) {
    return { error: 'Too many attempts. Try again in a minute.' };
  }

  const supabase = await createClient();
  // Always return the same generic message — never reveal whether an email exists.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site.url}/reset-password`,
  });
  return { error: undefined };
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function adminLogoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
