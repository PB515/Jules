'use client';
/**
 * No-login twin of station-client.tsx — same "Start attendance" flow, same
 * 5s poll, same rotating check-in code, but authorized purely by the
 * `token` prop (a long random secret from events.operator_token) instead
 * of an admin session. Every RPC call below passes p_token; the RPCs
 * themselves accept it as an OR'd alternative to the normal
 * can_manage_event() session check (0051_operator_links.sql). Deliberately
 * bare — no sidebar, no nav, no "Copy host link" (this already is the host
 * link) — just event name, Start/Restart, live metrics, recent scans.
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { site } from '@/lib/site';
import { EmptyState } from '@/lib/patterns/empty-state';
import { EnergyBar } from '@/lib/components/energy-bar';
import { Check, ShieldAlert, ScanLine, Play } from '@/lib/icons';
import QRCode from 'react-qr-code';

interface RecentScan {
  student_name: string;
  amount: number;
  flagged_geofence: boolean;
  created_at: string;
}

const DURATION_PRESETS = [15, 20, 30, 45, 60];

export function OperatorStationClient({ eventId, token }: { eventId: string; token: string }) {
  const [eventName, setEventName] = useState<string | null>(null);
  const [jouleValue, setJouleValue] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ students_scanned: 0, joules_distributed: 0 });
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [copied, setCopied] = useState(false);

  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [closesAt, setClosesAt] = useState<string | null>(null);
  const [duration, setDuration] = useState(20);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync on mount when the URL has no token, same pattern as lib/components/count-up.tsx
      setNotFound(true);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    async function poll() {
      const [eventRes, tokenRes, metricsRes, recentRes] = await Promise.all([
        supabase.rpc('get_event_for_operator', { p_event_id: eventId, p_token: token }),
        supabase.rpc('current_qr_token', { p_event_id: eventId, p_token: token }),
        supabase.rpc('event_scan_metrics', { p_event_id: eventId, p_token: token }),
        supabase.rpc('event_recent_scans', { p_event_id: eventId, p_limit: 8, p_token: token }),
      ]);
      if (cancelled) return;
      if (eventRes.error || !eventRes.data?.[0]) {
        setNotFound(true);
        return;
      }
      const e = eventRes.data[0];
      setEventName(e.name);
      setJouleValue(e.joule_value);
      setDuration(e.attendance_duration_minutes);
      setOpensAt(e.attendance_opens_at);
      setClosesAt(e.attendance_closes_at);
      setQrToken(tokenRes.data?.[0]?.token ?? null);
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
  }, [eventId, token]);

  const link = qrToken ? `${site.url}/scan?e=${eventId}&t=${qrToken}` : '';

  const closesMs = closesAt ? new Date(closesAt).getTime() : null;
  const windowState: 'not_started' | 'open' | 'closed' =
    !opensAt || !closesAt ? 'not_started' : now !== 0 && closesMs !== null && now > closesMs ? 'closed' : 'open';

  async function startAttendance() {
    setStarting(true);
    setStartError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('start_event_attendance', {
      p_event_id: eventId,
      p_duration_minutes: duration,
      p_token: token,
    });
    setStarting(false);
    if (error) {
      setStartError(error.message);
      return;
    }
    if (data?.[0]) {
      setOpensAt(data[0].attendance_opens_at);
      setClosesAt(data[0].attendance_closes_at);
    }
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 p-8 text-center">
        <EmptyState icon={ShieldAlert} title="This link isn't valid" message="Ask the person who shared it to send a fresh one." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Attendance</p>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{eventName ?? 'Loading…'}</p>
          <p className="text-sm text-tertiary">{jouleValue ?? '-'} SP per check-in</p>
        </div>

        {windowState === 'not_started' || windowState === 'closed' ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            {windowState === 'closed' ? <p className="text-sm text-muted">Attendance closed.</p> : null}
            <label className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-muted">Attendance window</span>
              <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATION_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={startAttendance}
              disabled={starting || !eventName}
              className="flex items-center gap-2 rounded-[var(--radius)] bg-gold px-5 py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
            >
              <Play className="size-4" aria-hidden />
              {starting ? 'Starting…' : windowState === 'closed' ? 'Start again' : 'Start attendance'}
            </button>
            {startError ? <p className="text-sm text-accent">{startError}</p> : null}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4">
            {closesAt ? (
              <div className="w-full max-w-[200px]">
                <EnergyBar
                  key={closesAt}
                  totalSeconds={Math.max(0, Math.round((new Date(closesAt).getTime() - new Date(opensAt!).getTime()) / 1000))}
                  running
                  onExpire={() => {}}
                />
              </div>
            ) : null}
            {link ? (
              <div className="rounded-[var(--radius)] bg-white p-3">
                <QRCode value={link} size={160} />
              </div>
            ) : null}
            <p className="text-xs text-muted">Current check-in code</p>
            <p className="font-mono text-4xl tracking-[0.15em] text-gold">{qrToken ?? '··········'}</p>
            <button
              onClick={copyLink}
              disabled={!link}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-gold disabled:opacity-50"
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : null}
              {copied ? 'Copied' : 'Copy check-in link'}
            </button>
            <button onClick={startAttendance} disabled={starting} className="text-xs text-muted underline hover:text-gold">
              {starting ? 'Restarting…' : 'Restart window'}
            </button>
            {startError ? <p className="text-sm text-accent">{startError}</p> : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 text-center">
          <p className="text-2xl font-medium">{metrics.students_scanned}</p>
          <p className="text-xs text-muted">students scanned</p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 text-center">
          <p className="text-2xl font-medium text-gold">{metrics.joules_distributed}</p>
          <p className="text-xs text-muted">Synergy Points distributed</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent scans</h2>
        {recent.length === 0 ? (
          <EmptyState icon={ScanLine} title="No scans yet" message="They'll appear here in real time." />
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
