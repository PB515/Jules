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
 * Respects prefers-reduced-motion by never rendering at all — every call
 * site already has a non-video fallback (confetti/sound/haptics, or just
 * the underlying UI), so skipping the clip here is a no-op, not a blank
 * screen.
 */
import { useEffect, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeroClip({
  src,
  frames,
  fps = 25,
  className,
  onComplete,
}: {
  src: string;
  frames: number;
  fps?: number;
  className?: string;
  onComplete?: () => void;
}) {
  // Lazy initializer, not an effect — deciding whether to show at all is a
  // pure read of a platform API, not a synchronization concern.
  const [visible, setVisible] = useState(() => !prefersReducedMotion());

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
    // eslint-disable-next-line @next/next/no-img-element -- animated WebP: next/image doesn't animate WebP, it re-optimizes to a static frame.
    <img src={src} alt="" className={className} />
  );
}
