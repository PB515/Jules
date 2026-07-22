import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { VaultClient } from './vault-client';

export const metadata = { title: 'Student Data Vault' };

export default async function VaultPage() {
  await requireAdmin(['super_admin']);
  const supabase = await createClient();
  const { data: students } = await supabase.rpc('admin_student_totals');

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-lg font-medium">Student Data Vault</h1>
      <p className="mb-6 text-xs text-tertiary">Super Admin only. Every Force Reset is audit-logged.</p>
      <VaultClient students={students ?? []} />
    </div>
  );
}
