import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  redirect(admin.role === 'owner' ? '/admin/ledger' : '/admin/grid');
}
