import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth/session';
import { AdminLoginForm } from './admin-login-form';

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect('/admin');
  return <AdminLoginForm />;
}
