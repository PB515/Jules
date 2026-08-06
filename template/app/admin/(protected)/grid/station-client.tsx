'use client';
/**
 * Dynamic Grid Management / QR Scan Station (spec §7). The token rotates every
 * 90s (0004_jules_functions.sql, deterministic HMAC — no stored/mutable
 * column). This client polls for the current token + live metrics every 5s so
 * the display always shows a fresh, redeemable code without a full reload.
 *
 * Attendance is decoupled from event_date (0050) — the scan window opens
 * only once someone actually presses "Start attendance," for a configurable
 * duration, independent of the event's scheduled time. This is the fix for
 * real events running late: the window opens whenever the room actually
 * fills up, not whenever the calendar said it would.
 *
 * Renders a real scannable QR (react-qr-code, decision 43) alongside the
 * text code + copy link, which stay as the manual/accessible fallback. The
 * QR itself is kept standard black-on-white (not theme-colored) — real-world
 * scan reliability across random phone cameras and lighting matters more
 * here than matching the dark UI around it.
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { site } from '@/lib/site';
import { EmptyState } from '@/lib/patterns/empty-state';
import { HeroClip } from '@/lib/components/hero-clip';
import { EnergyBar } from '@/lib/components/energy-bar';
import { Check, ShieldAlert, ScanLine, Play } from '@/lib/icons';
import QRCode from 'react-qr-code';

interface Props {
  eventId: string;
  eventName: string;
  jouleValue: number | null;
  attendanceDurationMinutes: number;
  attendanceOpensAt: string | null;
  attendanceClosesAt: string | null;
}

interface RecentScan {
  student_name: string;
  amount: number;
  flagged_geofence: boolean;
  created_at: string;
}

const DURATION_PRESETS = [15, 20, 30, 45, 60];

export function StationClient({
  eventId,
  eventName,
  jouleValue,
  attendanceDurationMinutes,
  attendanceOpensAt,
  attendanceClosesAt,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ students_scanned: 0, joules_distributed: 0 });
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [copied, setCopied] = useState(false);

  const [opensAt, setOpensAt] = useState(attendanceOpensAt);
  const [closesAt, setClosesAt] = useState(attendanceClosesAt);
  const [duration, setDuration] = useState(attendanceDurationMinutes);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  // Starts at 0, not Date.now() (keeps the component body pure) — the clock
  // interval below (started with no synchronous setState call, matching this
  // component's own established pattern) sets a real value within the first
  // tick.
  const [now, setNow] = useState(0);

  // The parent (grid/page.tsx) remounts this component via `key={eventId}`
  // when a different event is picked, so `opensAt`/`closesAt`/`duration`
  // above are always fresh from that event's own server-fetched props — no
  // reset-on-prop-change effect needed, same pattern EnergyBar's own
  // per-question remount already uses.

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function poll() {
      const [tokenRes, metricsRes, recentRes, eventRes] = await Promise.all([
        supabase.rpc('current_qr_token', { p_event_id: eventId }),
        supabase.rpc('event_scan_metrics', { p_event_id: eventId }),
        supabase.rpc('event_recent_scans', { p_event_id: eventId, p_limit: 8 }),
        supabase.from('events').select('attendance_opens_at, attendance_closes_at').eq('id', eventId).maybeSingle(),
      ]);
      if (cancelled) return;
      setToken(tokenRes.data?.[0]?.token ?? null);
      if (metricsRes.data?.[0]) setMetrics(metricsRes.data[0]);
      if (recentRes.data) setRecent(recentRes.data);
      if (eventRes.data) {
        setOpensAt(eventRes.data.attendance_opens_at);
        setClosesAt(eventRes.data.attendance_closes_at);
      }
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

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{eventName}</p>
            <p className="text-sm text-tertiary">{jouleValue ?? '-'} SP per check-in</p>
          </div>
        </div>

        {windowState === 'not_started' || windowState === 'closed' ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            {windowState === 'closed' ? <p className="text-sm text-muted">Attendance closed.</p> : null}
            <label className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-muted">Attendance window</span>
              <select
                className="input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {DURATION_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={startAttendance}
              disabled={starting}
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
            <p className="font-mono text-4xl tracking-[0.15em] text-gold">{token ?? '··········'}</p>
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

      {/* Plays once per page load — HeroClip only fires on mount, so the
          5s metrics poll below doesn't retrigger it. Deliberately a one-time
          accent, not a persistent loop — a professor/committee-member
          dashboard should read as calm, not have a flashy animation running
          forever underneath it (design-brief.md's own "restraint" direction
          for admin screens specifically). */}
      <HeroClip src="/videos/professor-analytics.webp" frames={96} />

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
