/**
 * Ambient, full-page particle-network backdrop for the public homepage —
 * the same visual language as gallery-placeholder.tsx (nodes + connecting
 * lines + a couple of glowing "energy" points), scaled up to a persistent
 * background layer. Deliberately restrained (low opacity, thin strokes) so
 * body text sitting on top of it stays fully readable.
 *
 * Server-renderable, no client hooks: the drift is pure CSS (a plain <style>
 * tag, not styled-jsx, so this never needs 'use client') with per-node
 * duration/delay baked into deterministic inline styles — nothing here
 * depends on JS to become visible, and prefers-reduced-motion disables the
 * drift entirely via a plain media query, same posture as every other
 * motion piece built this session.
 */
interface Node {
  x: number;
  y: number;
  r: number;
  color: string;
  dur: number;
  delay: number;
  glow?: boolean;
}

const NODES: Node[] = [
  { x: 80, y: 120, r: 4, color: 'var(--tertiary)', dur: 7, delay: 0 },
  { x: 180, y: 300, r: 6, color: 'var(--gold)', dur: 9, delay: 1.2 },
  { x: 140, y: 500, r: 3, color: 'var(--tertiary)', dur: 8, delay: 2.4 },
  { x: 300, y: 650, r: 5, color: 'var(--gold)', dur: 10, delay: 0.6 },
  { x: 250, y: 200, r: 3, color: 'var(--accent)', dur: 7.5, delay: 3 },
  { x: 420, y: 420, r: 7, color: 'var(--gold)', dur: 11, delay: 1.8, glow: true },
  { x: 480, y: 150, r: 4, color: 'var(--tertiary)', dur: 8.5, delay: 0.3 },
  { x: 600, y: 550, r: 3, color: 'var(--tertiary)', dur: 9.5, delay: 2.1 },
  { x: 650, y: 250, r: 5, color: 'var(--gold)', dur: 7, delay: 3.6 },
  { x: 750, y: 450, r: 4, color: 'var(--accent)', dur: 10.5, delay: 0.9 },
  { x: 820, y: 120, r: 3, color: 'var(--tertiary)', dur: 8, delay: 2.7 },
  { x: 900, y: 600, r: 6, color: 'var(--gold)', dur: 9, delay: 1.5, glow: true },
  { x: 950, y: 300, r: 4, color: 'var(--tertiary)', dur: 7.8, delay: 3.3 },
  { x: 1020, y: 480, r: 3, color: 'var(--gold)', dur: 10, delay: 0.4 },
  { x: 1100, y: 180, r: 5, color: 'var(--tertiary)', dur: 8.2, delay: 2 },
  { x: 1120, y: 650, r: 4, color: 'var(--gold)', dur: 9.4, delay: 1 },
  { x: 550, y: 700, r: 3, color: 'var(--tertiary)', dur: 7.3, delay: 2.9 },
  { x: 350, y: 80, r: 4, color: 'var(--gold)', dur: 8.8, delay: 0.7 },
  { x: 1000, y: 80, r: 3, color: 'var(--tertiary)', dur: 9.8, delay: 1.6 },
  { x: 700, y: 700, r: 4, color: 'var(--accent)', dur: 7.6, delay: 3.4 },
];

const LINES = [
  [80, 120, 180, 300],
  [180, 300, 140, 500],
  [140, 500, 300, 650],
  [250, 200, 180, 300],
  [250, 200, 420, 420],
  [420, 420, 480, 150],
  [420, 420, 600, 550],
  [480, 150, 650, 250],
  [600, 550, 650, 250],
  [650, 250, 750, 450],
  [750, 450, 820, 120],
  [750, 450, 900, 600],
  [900, 600, 950, 300],
  [950, 300, 1020, 480],
  [1020, 480, 1100, 180],
  [1100, 180, 1120, 650],
  [600, 550, 550, 700],
  [350, 80, 480, 150],
  [1000, 80, 1100, 180],
  [700, 700, 900, 600],
] as const;

export function EnergyField() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <filter id="energy-field-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g stroke="var(--border)" strokeWidth="1" opacity="0.35">
        {LINES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      {NODES.map((n, i) =>
        n.glow ? (
          <circle
            key={`glow-${i}`}
            cx={n.x}
            cy={n.y}
            r={n.r + 5}
            fill={n.color}
            opacity="0.4"
            filter="url(#energy-field-glow)"
          />
        ) : null
      )}
      {NODES.map((n, i) => (
        <circle
          key={i}
          className="energy-field-node"
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={n.color}
          opacity="0.6"
          style={{ animationDuration: `${n.dur}s`, animationDelay: `${n.delay}s` }}
        />
      ))}
      <style>{`
        .energy-field-node {
          animation-name: energy-field-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes energy-field-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(6px, -8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .energy-field-node { animation: none; }
        }
      `}</style>
    </svg>
  );
}
