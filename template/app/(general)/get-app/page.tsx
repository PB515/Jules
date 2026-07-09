import { site } from '@/lib/site';
import { Smartphone } from '@/lib/icons';
import { InstallButton } from './install-button';

export const metadata = { title: 'Get the App' };

export default function GetAppPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 py-6 text-center">
      <Smartphone className="size-10 text-gold" aria-hidden />
      <div>
        <h1 className="text-2xl font-medium">Get Jules on your phone</h1>
        <p className="mt-2 text-sm text-muted">
          The student side of Jules, your Grid, QR check-ins, Surges, and Live Round, only runs as an
          installed app on your phone. This keeps quizzes fair and focused, one device, nothing else
          open.
        </p>
      </div>

      <div className="w-full rounded-[var(--radius)] border border-border bg-card p-5 text-left">
        <p className="mb-1 text-xs uppercase tracking-wide text-tertiary">The link to open on your phone</p>
        <p className="font-mono text-sm break-all text-gold">{site.url}</p>
      </div>

      <InstallButton />

      <div className="w-full space-y-4 text-left text-sm text-muted">
        <div>
          <p className="mb-1 font-medium text-foreground">Android (Chrome)</p>
          <p>Open the link above, then tap the install button, or the menu (⋮) → &quot;Add to Home screen&quot;.</p>
        </div>
        <div>
          <p className="mb-1 font-medium text-foreground">iPhone (Safari)</p>
          <p>Open the link above, tap the Share icon, then &quot;Add to Home Screen&quot;.</p>
        </div>
      </div>
    </div>
  );
}
