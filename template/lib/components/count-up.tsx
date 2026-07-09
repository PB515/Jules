'use client';
/**
 * CountUp — animates a number from 0 to `value` over ~700ms (spec §3 motion:
 * "Balance/counter numbers animate with a count-up rather than snapping").
 * Honors prefers-reduced-motion by rendering the final value immediately.
 */
import { useEffect, useRef, useState } from 'react';

export function CountUp({ value, durationMs = 700, className }: { value: number; durationMs?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Syncs the display with a changed prop under reduced-motion — skips the
      // rAF loop entirely, a legitimate one-shot effect sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      prevValue.current = value;
      return;
    }

    const from = prevValue.current;
    const to = value;
    const start = performance.now();

    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevValue.current = to;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{display.toLocaleString()}</span>;
}
