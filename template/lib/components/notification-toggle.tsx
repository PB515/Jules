'use client';
/**
 * "Enable notifications" opt-in for Profile — the professor's ask for a
 * WhatsApp-style push, confirmed scoped to two server-side-gated types:
 * new-event broadcasts and event-info updates for registered students only
 * (see lib/jules/push.ts). Nothing is ever pushed until a student
 * explicitly does this — Notification.requestPermission() is itself
 * always opt-in at the browser/OS level regardless, but this is the
 * in-app control that triggers it.
 *
 * Fails quietly, not open — a browser with no Push API support (or a
 * student who denies the permission prompt) just sees the toggle stay in
 * its "off" state; nothing else on Profile depends on this working.
 */
import { useEffect, useState } from 'react';
import { subscribeToPushAction, unsubscribeFromPushAction } from '@/app/(node)/profile/actions';
import { Bell } from '@/lib/icons';

type Status = 'checking' | 'unsupported' | 'off' | 'on';

// Returns ArrayBuffer, not Uint8Array — pushManager.subscribe()'s
// applicationServerKey wants a BufferSource, and newer TS DOM lib types
// reject a Uint8Array<ArrayBufferLike> there (a real TS/DOM-lib typing
// friction point, not an app bug); an ArrayBuffer sidesteps it cleanly.
function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

export function NotificationToggle() {
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync deriving from a platform-API capability check, same pattern as lib/components/count-up.tsx
      setStatus('unsupported');
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'on' : 'off'))
      .catch(() => setStatus('off'));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notifications were blocked. Enable them in your browser/phone settings to turn this on.');
        setStatus('off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error('Push isn’t configured yet.');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      });
      const json = sub.toJSON();
      await subscribeToPushAction({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      setStatus('on');
    } catch {
      setError('Could not enable notifications. Try again in a bit.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus('off');
    } catch {
      setError('Could not disable notifications. Try again in a bit.');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'unsupported' || status === 'checking') return null;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Bell className="size-4 text-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-tertiary">
              {status === 'on'
                ? 'On: new events and updates for events you’ve registered for.'
                : 'Get a notification for new events and updates on events you’ve registered for.'}
            </p>
          </div>
        </div>
        <button
          onClick={status === 'on' ? disable : enable}
          disabled={busy}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium disabled:opacity-60 ${
            status === 'on' ? 'border border-border text-muted' : 'bg-adani-gradient text-white'
          }`}
        >
          {busy ? '…' : status === 'on' ? 'Disable' : 'Enable'}
        </button>
      </div>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
    </div>
  );
}
