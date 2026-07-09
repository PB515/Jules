import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle();
  if (admin) redirect('/admin');

  redirect('/dashboard');
}
