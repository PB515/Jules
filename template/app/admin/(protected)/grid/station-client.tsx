'use client';
/**
 * Dynamic Grid Management / QR Scan Station (spec §7). The token rotates every
 * 90s (0004_jules_functions.sql, deterministic HMAC — no stored/mutable
 * column). This client polls for the current token + live metrics every 5s so
 * the display always shows a fresh, redeemable code without a full reload.
 *
 * No QR image library is vendored here (see CLAUDE.md build log) — the
 * check-in link + a large human-readable code cover the same flow and are
 * fully testable without a camera. Wiring a real scannable QR image is a
 * flagged follow-up needing a one-line dependency decision.
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { site } from '@/lib/site';
import { Check, ShieldAlert } from '@/lib/icons';

interface Props {
  eventId: string;
  eventName: string;
  jouleValue: number | null;
}

interface RecentScan {
  student_name: string;
  amount: number;
  flagged_geofence: boolean;
  created_at: string;
}

export function StationClient({ eventId, eventName, jouleValue }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  // Starts at 0, not Date.now() (keeps the component body pure) — the clock
  // effect below sets a real value within the first second.
  const [now, setNow] = useState(0);
  const [metrics, setMetrics] = useState({ students_scanned: 0, joules_distributed: 0 });
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function poll() {
      const [tokenRes, metricsRes, recentRes] = await Promise.all([
        supabase.rpc('current_qr_token', { p_event_id: eventId }),
        supabase.rpc('event_scan_metrics', { p_event_id: eventId }),
        supabase.rpc('event_recent_scans', { p_event_id: eventId, p_limit: 8 }),
      ]);
      if (cancelled) return;
      if (tokenRes.data?.[0]) {
        setToken(tokenRes.data[0].token);
        setExpiresAt(new Date(tokenRes.data[0].expires_at).getTime());
      }
      if (metricsRes.data?.[0]) setMetrics(metricsRes.data[0]);
      if (recentRes.data) setRecent(recentRes.data);
    }

    poll();
    const dataInterval = setInterval(poll, 5000);
    const clockInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, [eventId]);

  const link = token ? `${site.url}/scan?e=${eventId}&t=${token}` : '';
  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : null;

  function copyLink() {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{eventName}</p>
            <p className="text-sm text-tertiary">{jouleValue ?? '-'} J per check-in</p>
          </div>
          {secondsLeft !== null ? (
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-tertiary">
              rotates in {secondsLeft}s
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-xs text-muted">Current check-in code</p>
          <p className="font-mono text-4xl tracking-[0.15em] text-gold">{token ?? '··········'}</p>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-gold"
          >
            {copied ? <Check className="size-3.5" aria-hidden /> : null}
            {copied ? 'Copied' : 'Copy check-in link'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 text-center">
          <p className="text-2xl font-medium">{metrics.students_scanned}</p>
          <p className="text-xs text-muted">students scanned</p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 text-center">
          <p className="text-2xl font-medium text-gold">{metrics.joules_distributed}</p>
          <p className="text-xs text-muted">Joules distributed</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent scans</h2>
        {recent.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-border p-6 text-center text-sm text-tertiary">
            No scans yet. They&apos;ll appear here in real time.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  {r.student_name}
                  {r.flagged_geofence ? (
                    <ShieldAlert className="size-3.5 text-accent" aria-label="Flagged for location review" />
                  ) : null}
                </span>
                <span className="text-xs text-tertiary">{new Date(r.created_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
