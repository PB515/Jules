/**
 * The public Gallery's empty-state illustration — used while the club
 * hasn't uploaded any real event photos yet. Deliberately an abstract
 * "energy grid" scatter of glowing nodes, not a mockup pretending to be a
 * real event photo, so it never reads as misleading placeholder content.
 * Server-renderable, no client hooks.
 */
export function GalleryPlaceholder({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" className={className} aria-hidden>
      <defs>
        <filter id="gallery-placeholder-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g stroke="var(--border)" strokeWidth="1.5" opacity="0.5">
        <line x1="40" y1="180" x2="110" y2="90" />
        <line x1="110" y1="90" x2="170" y2="150" />
        <line x1="170" y1="150" x2="230" y2="60" />
        <line x1="170" y1="150" x2="260" y2="190" />
        <line x1="230" y1="60" x2="320" y2="110" />
        <line x1="260" y1="190" x2="350" y2="200" />
        <line x1="320" y1="110" x2="300" y2="40" />
        <line x1="320" y1="110" x2="350" y2="200" />
      </g>
      <circle cx="40" cy="180" r="10" fill="var(--gold)" opacity="0.5" filter="url(#gallery-placeholder-glow)" />
      <circle cx="170" cy="150" r="12" fill="var(--gold)" opacity="0.5" filter="url(#gallery-placeholder-glow)" />
      <circle cx="40" cy="180" r="5" fill="var(--gold)" />
      <circle cx="110" cy="90" r="3" fill="var(--tertiary)" />
      <circle cx="170" cy="150" r="7" fill="var(--gold)" />
      <circle cx="230" cy="60" r="4" fill="var(--accent)" />
      <circle cx="260" cy="190" r="4" fill="var(--tertiary)" />
      <circle cx="320" cy="110" r="5" fill="var(--gold)" />
      <circle cx="350" cy="200" r="3" fill="var(--tertiary)" />
      <circle cx="300" cy="40" r="3" fill="var(--tertiary)" />
    </svg>
  );
}
