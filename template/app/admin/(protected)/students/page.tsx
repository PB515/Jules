import { requireAdmin } from '@/lib/auth/session';
import { BulkCreateForm } from './bulk-create-form';

export const metadata = { title: 'Students' };

/**
 * Its own top-level Command Center tab, not a section buried inside
 * Institution Settings — the bulk-creation flow there read as too complex
 * on an already-dense page (allowed domains, seasons, clubs, admin roster,
 * and this, all stacked in one scroll). Same underlying logic
 * (bulkCreateStudentsAction in ./actions.ts), just a dedicated route with a
 * clearer layout. Super Admin only, matching the action's own
 * requireAdmin(['super_admin']) gate.
 */
export default async function StudentsPage() {
  await requireAdmin(['super_admin']);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Students</h1>
        <p className="mt-1 text-xs text-tertiary">
          No self-signup expected. Create every student&apos;s account here and send them the CSV yourself. Each
          student can change their password after logging in.
        </p>
      </div>
      <BulkCreateForm />
    </div>
  );
}
