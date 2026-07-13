import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  redirect(admin.role === 'professor' ? '/admin/ledger' : '/admin/grid');
}
