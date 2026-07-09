'use client';
/**
 * Scan event QR (spec §6/§9). The QR the admin displays encodes a deep link
 * (`/scan?e=<event>&t=<token>`) rather than needing an in-app camera decoder —
 * a student's native camera app opens it directly, no extra dependency. A
 * manual fallback (pick event + paste code) covers testing / camera issues.
 */
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CircleCheck, CircleX, ScanLine } from '@/lib/icons';
import { TierBadge } from '@/lib/components/tier-badge';
import type { Tier } from '@/lib/supabase/database.types';

interface ScannableEvent {
  id: string;
  name: string;
  type: string;
  joule_value: number | null;
}

type Result =
  | { state: 'idle' }
  | { state: 'redeeming' }
  | { state: 'success'; amount: number; tier: Tier; flagged: boolean }
  | { state: 'error'; message: string };

export function ScanClient({
  initialEventId,
  initialToken,
  events,
}: {
  initialEventId: string;
  initialToken: string;
  events: ScannableEvent[];
}) {
  const [eventId, setEventId] = useState(initialEventId);
  const [token, setToken] = useState(initialToken);
  const [result, setResult] = useState<Result>({ state: 'idle' });

  const redeem = useCallback(async (e: string, t: string) => {
    if (!e || !t) return;
    setResult({ state: 'redeeming' });
    const supabase = createClient();

    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('no geolocation'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // Geofence is a soft flag only — proceed without location (spec §9).
    }

    const { data, error } = await supabase.rpc('redeem_event_scan', {
      p_event_id: e,
      p_token: t,
      p_lat: lat ?? null,
      p_lng: lng ?? null,
    });

    if (error) {
      setResult({ state: 'error', message: friendlyError(error.message) });
      return;
    }
    const row = data?.[0];
    if (!row) {
      setResult({ state: 'error', message: 'Something went wrong. Try again.' });
      return;
    }
    setResult({ state: 'success', amount: row.amount, tier: row.tier, flagged: row.flagged_geofence });
  }, []);

  useEffect(() => {
    // Kicks off the redemption network call on mount when the QR deep-link
    // carried e/t params — a genuine effect (I/O), not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialEventId && initialToken) redeem(initialEventId, initialToken);
  }, [initialEventId, initialToken, redeem]);

  if (result.state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-success/40 bg-card p-8 text-center">
        <CircleCheck className="size-10 text-success" aria-hidden />
        <div>
          <p className="text-2xl font-medium text-gold">+{result.amount} J</p>
          <p className="mt-1 text-sm text-muted">Credited to your Grid</p>
        </div>
        <TierBadge tier={result.tier} />
        {result.flagged ? (
          <p className="text-xs text-tertiary">Flagged for admin review (location check), your Joules are still credited.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <ScanLine className="size-10 text-tertiary" aria-hidden />
        <p className="text-sm text-muted">
          Point your camera app at the event&apos;s QR code. It opens straight into this check-in.
        </p>
      </div>

      {result.state === 'error' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-accent/40 bg-card p-3 text-sm text-accent">
          <CircleX className="size-4 shrink-0" aria-hidden />
          {result.message}
        </div>
      ) : null}

      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-muted">Or check in manually</p>
        <div className="flex flex-col gap-3">
          <select
            className="input"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">Select event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.joule_value}J)
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="10-character code"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <button
            onClick={() => redeem(eventId, token)}
            disabled={!eventId || !token || result.state === 'redeeming'}
            className="rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-50"
          >
            {result.state === 'redeeming' ? 'Checking in…' : 'Check in'}
          </button>
        </div>
      </div>
    </div>
  );
}

function friendlyError(message: string): string {
  if (message.includes('already credited')) return 'Already credited for this event.';
  if (message.includes('scan window')) return 'This event is not open for check-in right now.';
  if (message.includes('invalid or expired')) return 'That code is invalid or expired. Get the current one from the event screen.';
  if (message.includes('not found')) return "That event couldn't be found.";
  return 'Could not check you in. Try again.';
}
