import { createClient } from '@/lib/supabase/server';
import { getStudent } from '@/lib/auth/session';
import { GeneralLayoutClient } from './general-layout-client';

export default async function GeneralLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ data: clubs }, student] = await Promise.all([supabase.rpc('public_clubs'), getStudent()]);

  return (
    <GeneralLayoutClient
      clubs={(clubs ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, instagram_url: c.instagram_url }))}
      isStudent={student !== null}
    >
      {children}
    </GeneralLayoutClient>
  );
}
