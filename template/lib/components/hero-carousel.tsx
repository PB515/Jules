'use client';
/**
 * Full-bleed auto-swiping event/club showcase for the homepage hero's right
 * column, per the finalized public site prototype. Slide copy is
 * deliberately generic ("Energy Sector Insights," not a specific named past
 * event) — this project has already been burned once by generated content
 * implying a real event that didn't happen (design-brief.md's own note on
 * decision 41's Gallery placeholder); real club cover art is fine to use
 * since it's illustrative brand art, not a claimed photo of an event.
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronRight, Zap } from '@/lib/icons';

interface Slide {
  img: string;
  tag: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  { img: '/images/club_01_joules_energy_cover.jpeg', tag: 'Joules Club', title: 'Energy Sector Insights', subtitle: 'Dr. Namita Pragya · Energy Sector' },
  { img: '/images/club_02_gati_logistics_cover.jpeg', tag: 'Gati Club', title: 'Logistics & Global Trade', subtitle: 'Prof. Rachna Gangwar · Transport & Logistics' },
  { img: '/images/club_05_marketing_mavericks_cover.jpeg', tag: 'Marketing Mavericks', title: 'Digital Growth & Strategy', subtitle: 'Prof. Chatterjee & Prof. Sanyal · Marketing' },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-900">
      {SLIDES.map((s, i) => (
        <Image
          key={s.img}
          src={s.img}
          alt=""
          fill
          sizes="(min-width: 1024px) 42vw, 100vw"
          priority={i === 0}
          className={`object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/20" />

      <div className="absolute top-5 right-5 left-5 z-20 flex items-center justify-between">
        <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold tracking-wider text-white uppercase shadow-md">{slide.tag}</span>
        <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-slate-900 shadow-md">
          <Zap className="size-3" aria-hidden />
          +250 J
        </span>
      </div>

      <div className="absolute right-5 bottom-6 left-5 z-20 space-y-3 text-left">
        <div>
          <h4 className="text-xl leading-snug font-black text-white drop-shadow-sm">{slide.title}</h4>
          <p className="text-xs font-medium text-slate-300">{slide.subtitle}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`rounded-full transition-all ${i === index ? 'size-2.5 bg-white' : 'size-2 bg-white/40'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
            aria-label="Next slide"
            className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
