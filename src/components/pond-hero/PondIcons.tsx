import { cn } from "@/lib/utils";

const FEED_PELLETS = [
  { x: 22, y: 20, s: 8, h: 34 },
  { x: 15, y: 16, s: 7, h: 30 },
  { x: 29, y: 17, s: 7.5, h: 38 },
  { x: 18, y: 26, s: 6.5, h: 32 },
  { x: 27, y: 25, s: 7, h: 36 },
  { x: 24, y: 12, s: 5.5, h: 29 },
  { x: 11, y: 21, s: 5, h: 31 },
  { x: 35, y: 23, s: 5.5, h: 33 },
];

/** Feed-mode toggle — pellet cluster (SVG, matches baothiento hero). */
export function PondFeedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 46 46"
      className={cn("size-[46px]", className)}
      aria-hidden
    >
      <defs>
        {FEED_PELLETS.map((p, i) => (
          <radialGradient
            key={i}
            id={`pond-pellet-${i}`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor={`hsl(${p.h}, 45%, 60%)`} stopOpacity={0.5} />
            <stop offset="50%" stopColor={`hsl(${p.h}, 40%, 45%)`} stopOpacity={0.3} />
            <stop offset="100%" stopColor={`hsl(${p.h}, 35%, 35%)`} stopOpacity={0.1} />
          </radialGradient>
        ))}
      </defs>
      {FEED_PELLETS.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.s / 2}
          fill={`url(#pond-pellet-${i})`}
        />
      ))}
    </svg>
  );
}

export function PondCloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("size-[22px]", className)}
      aria-hidden
    >
      <line
        x1="4"
        y1="4"
        x2="16"
        y2="16"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="4"
        x2="4"
        y2="16"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
