/**
 * The avatar's atmospheric backdrop — pure SVG, no runtime cost. Reuses
 * hero-atom.tsx's ghosted orbit-ring motif and energy-field.tsx's
 * deterministic particle-and-line language as the environment behind the
 * 3D scene, instead of a bare canvas. Renders once; the live R3F canvas
 * sits transparently on top of this in avatar-scene.tsx.
 */
export function AvatarBackdrop() {
  return (
    <svg
      viewBox="0 0 300 340"
      aria-hidden
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="avatar-bg" cx="50%" cy="26%" r="75%">
          <stop offset="0%" stopColor="#16324a" />
          <stop offset="45%" stopColor="#0d1620" />
          <stop offset="85%" stopColor="#070b12" />
        </radialGradient>
        <filter id="avatar-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width="300" height="340" fill="url(#avatar-bg)" />
      <ellipse cx="150" cy="130" rx="105" ry="40" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.1" transform="rotate(24 150 130)" />
      <ellipse cx="150" cy="130" rx="105" ry="40" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.1" transform="rotate(-24 150 130)" />
      <ellipse cx="150" cy="278" rx="80" ry="16" fill="var(--gold)" opacity="0.18" filter="url(#avatar-soft)" />
      <ellipse cx="150" cy="278" rx="58" ry="11" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
