import { requireAdmin } from '@/lib/auth/session';
import { adminLogoutAction } from '@/app/(auth)/actions';
import { AdminNav } from './admin-nav-client';
import { LogOut } from '@/lib/icons';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="border-b border-border px-5 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Jules</p>
          <p className="text-sm font-medium">Reactor Command Center</p>
        </div>
        <AdminNav role={admin.role} />
        <div className="border-t border-border p-3">
          <p className="px-3 py-1 text-xs text-tertiary">{admin.name} · {admin.role}</p>
          <form action={adminLogoutAction}>
            <button className="flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-sm text-muted hover:bg-background">
              <LogOut className="size-4" aria-hidden />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:hidden">
          <p className="text-sm font-medium">Reactor Command Center</p>
          <form action={adminLogoutAction}>
            <button className="text-xs text-muted">Log out</button>
          </form>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
