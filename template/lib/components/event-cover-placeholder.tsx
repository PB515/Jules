/**
 * Fallback illustration for an event card/detail page with no uploaded
 * cover image yet (cover upload, decision from Phase C, is recent — most
 * events don't have one). Deliberately an abstract spark-burst motif (same
 * "atom generating a spark" language as the app icon, decision 41) rather
 * than a generic file/document icon, so a cover-less card reads as "no
 * photo yet" instead of looking like a broken image. Server-renderable,
 * no client hooks.
 */
export function EventCoverPlaceholder({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 225" className={className} aria-hidden>
      <defs>
        <filter id="event-cover-placeholder-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <circle cx="200" cy="112" r="70" fill="var(--gold)" opacity="0.12" filter="url(#event-cover-placeholder-glow)" />
      <g stroke="var(--border)" strokeWidth="1.5" opacity="0.6" fill="none">
        <circle cx="200" cy="112" r="52" />
        <circle cx="200" cy="112" r="72" />
      </g>
      <g opacity="0.7">
        <circle cx="200" cy="60" r="3.5" fill="var(--tertiary)" />
        <circle cx="252" cy="112" r="3" fill="var(--accent)" />
        <circle cx="200" cy="164" r="3" fill="var(--tertiary)" />
        <circle cx="148" cy="112" r="3.5" fill="var(--tertiary)" />
      </g>
      <path
        d="M208 78 L182 118 L198 118 L192 146 L220 106 L202 106 Z"
        fill="var(--gold)"
      />
    </svg>
  );
}
