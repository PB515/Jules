import { site } from '@/lib/site';
import { Smartphone } from '@/lib/icons';
import { InstallButton } from './install-button';
import QRCode from 'react-qr-code';

export const metadata = { title: 'Get the App' };

export default function GetAppPage() {
  const link = `${site.url}/get-app`;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 py-6 text-center">
      <Smartphone className="size-10 text-gold" aria-hidden />
      <div>
        <h1 className="text-2xl font-medium">Get Synergy on your phone</h1>
        <p className="mt-2 text-sm text-muted">
          The student side of Synergy, your Grid, QR check-ins, Surges, and Live Round, only runs as an
          installed app on your phone. This keeps quizzes fair and focused, one device, nothing else
          open.
        </p>
      </div>

      <div className="rounded-[var(--radius)] bg-white p-3">
        <QRCode value={link} size={140} />
      </div>

      <div className="w-full rounded-[var(--radius)] border border-border bg-card p-5 text-left">
        <p className="mb-1 text-xs uppercase tracking-wide text-tertiary">The link to open on your phone</p>
        <p className="font-mono text-sm break-all text-gold">{link}</p>
      </div>

      <InstallButton />

      <div className="w-full rounded-[var(--radius)] border border-accent/40 bg-card p-4 text-left text-xs text-accent">
        Opened this link from WhatsApp, Instagram, or another app? Tap the <strong>••• (or Safari icon)</strong>{' '}
        at the bottom or top-right first to open it in your real browser, not the in-app one. &quot;Add to
        Home Screen&quot; only shows up there.
      </div>

      <div className="w-full space-y-4 text-left text-sm text-muted">
        <div>
          <p className="mb-1 font-medium text-foreground">Android (Chrome)</p>
          <p>Open the link above in Chrome, then tap the install button above, or the menu (⋮) → &quot;Add to Home screen&quot;.</p>
        </div>
        <div>
          <p className="mb-1 font-medium text-foreground">iPhone (Safari)</p>
          <p>
            Open the link above in Safari (there&apos;s no install button on iPhone, that&apos;s expected). Tap the{' '}
            <strong>Share icon</strong>{' '}
            in the bottom toolbar (the square with an arrow pointing up), scroll down, then tap &quot;Add to
            Home Screen&quot;.
          </p>
        </div>
      </div>
    </div>
  );
}
