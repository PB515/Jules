import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { DomainsEditor } from './domains-editor';
import { SeasonsSection } from './seasons-section';
import { RosterSection } from './roster-section';

export const metadata = { title: 'Institution Settings' };

export default async function SettingsPage() {
  await requireAdmin(['owner']);
  const supabase = await createClient();

  const [{ data: settings }, { data: seasons }, { data: admins }, { data: events }] = await Promise.all([
    supabase.from('institution_settings').select('*').eq('id', true).maybeSingle(),
    supabase.from('seasons').select('*').order('start_date', { ascending: false }),
    supabase.from('admins').select('id, name, email, role').order('name'),
    supabase.from('events').select('id, name').neq('type', 'surge').order('event_date', { ascending: false }).limit(50),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-lg font-medium">Institution Settings</h1>

      <section>
        <h2 className="mb-1 text-sm font-medium text-muted">Allowed college email domains</h2>
        <p className="mb-3 text-xs text-tertiary">
          ★ Placeholder until replaced (docs/project-spec.md §9). Students can only sign up with an email on this list.
        </p>
        <DomainsEditor initial={settings?.allowed_domains ?? []} />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium text-muted">Seasons</h2>
        <p className="mb-3 text-xs text-tertiary">
          ★ Placeholder calendar until replaced with the real registrar dates (docs/project-spec.md §9).
        </p>
        <SeasonsSection seasons={seasons ?? []} />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium text-muted">Admin roster</h2>
        <p className="mb-3 text-xs text-tertiary">Role changes are audit-logged.</p>
        <RosterSection admins={admins ?? []} events={events ?? []} />
      </section>
    </div>
  );
}
