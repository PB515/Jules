'use client';
/**
 * Plays a real generated animated-WebP hero moment exactly once, then
 * unmounts. The source files are all encoded with an infinite loop count
 * baked in (confirmed via ffmpeg/Pillow — not something an <img> attribute
 * can override, since animated-WebP loop count lives inside the file
 * itself), so this component measures the real duration from `frames`/`fps`
 * and removes the element after one pass rather than letting it repeat —
 * these are one-shot celebration beats, not idle loops (matches the design
 * brief's "restraint, not spectacle" direction — a looping trophy/confetti
 * animation forever would read as exactly the gamified spectacle the
 * professor pushed back on).
 *
 * Every clip is a real 720x1280 (9:16) portrait recording, made
 * specifically for the mobile PWA experience — so this renders as a
 * uniform full-screen overlay, and only ever on a mobile-sized viewport
 * (confirmed with the user: never on laptop, even for the admin-panel call
 * sites that aren't behind the mobile-PWA gate, decision 29). Being fixed
 * and full-screen also means it's removed from normal document flow, so
 * every existing call site's surrounding layout (a result card, a stat
 * grid, etc.) renders exactly as it did before — the clip just flashes on
 * top of it for one pass, then reveals what was already there underneath.
 *
 * Respects prefers-reduced-motion by never rendering at all — every call
 * site already has a non-video fallback (confetti/sound/haptics, or just
 * the underlying UI), so skipping the clip here is a no-op, not a blank
 * screen.
 */
import { useEffect, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Same breakpoint this app already treats as "mobile" elsewhere (the admin
// nav's own sm:hidden/sm:flex split) — not a new threshold to reason about.
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
}

export function HeroClip({
  src,
  frames,
  fps = 25,
  onComplete,
}: {
  src: string;
  frames: number;
  fps?: number;
  onComplete?: () => void;
}) {
  // Lazy initializer, not an effect — deciding whether to show at all is a
  // pure read of platform APIs, not a synchronization concern.
  const [visible, setVisible] = useState(() => !prefersReducedMotion() && isMobileViewport());

  useEffect(() => {
    if (!visible) return;
    const ms = (frames / fps) * 1000;
    const t = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once for this mount's clip; frames/fps/onComplete are stable per call site
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP: next/image doesn't animate WebP, it re-optimizes to a static frame. */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
