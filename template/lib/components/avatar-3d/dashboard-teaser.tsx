'use client';
/**
 * Dashboard's static avatar teaser (Stage 3 of the plan, small enough to
 * ship alongside Stage 1). No 3D here at all — just the static teaser
 * image plus a one-time GSAP ScrollTrigger reveal as it scrolls into view.
 * `toggleActions` (a discrete reveal), never `scrub` — combining the two
 * is exactly what gsap-scrolltrigger's own rules say not to do. `once:
 * true` so it never re-fires on scroll-out/back-in.
 */
import { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from '@/lib/icons';

gsap.registerPlugin(ScrollTrigger);

export function DashboardTeaser() {
  const ref = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      gsap.from(ref.current, {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 90%',
          once: true,
          toggleActions: 'play none none none',
        },
      });
    },
    { scope: ref }
  );

  return (
    <Link
      ref={ref}
      href="/profile"
      className="flex items-center gap-2.5 rounded-[var(--radius)] border border-border bg-card p-2.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- small static teaser asset, not an optimizable content image */}
      <img src="/images/avatar/dashboard-teaser.png" alt="" className="h-[46px] w-[46px] flex-shrink-0 rounded-lg object-cover" />
      <div>
        <p className="text-[12.5px] font-medium">Your character</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gold">
          View your character <ArrowRight className="size-3" aria-hidden />
        </p>
      </div>
    </Link>
  );
}
