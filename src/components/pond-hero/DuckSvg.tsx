import { memo, useEffect, useState } from "react";

function PaddleFeet() {
  const [side, setSide] = useState(() => Math.random() > 0.5);
  useEffect(() => {
    const id = setInterval(() => setSide((s) => !s), 250);
    return () => clearInterval(id);
  }, []);
  const x = side ? 21.5 : 26;
  return (
    <g opacity={0.35}>
      <line
        x1={x + 0.5}
        y1={33}
        x2={x + 0.5}
        y2={36}
        stroke="#E8A030"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.6}
      />
      <g transform={`translate(${x}, 35.5)`}>
        <path
          d="M-0.8 0 L-1.5 2 L-0.3 1.5 L0.5 2.5 L1.3 1.5 L2.5 2 L1.8 0Z"
          fill="#E8A030"
        />
      </g>
    </g>
  );
}

export const DuckSvg = memo(function DuckSvg({
  paddling = false,
  mallard = false,
}: {
  paddling?: boolean;
  mallard?: boolean;
}) {
  const bodyGrad = mallard ? "mallard-body-grad" : "body-grad";
  const headGrad = mallard ? "mallard-head-grad" : "head-grad";
  const beakGrad = mallard ? "mallard-beak-grad" : "beak-grad";

  return (
    <svg
      width={72}
      height={72}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <filter id="duck-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
        <radialGradient id="body-grad" cx="0.48" cy="0.38" r="0.55">
          <stop offset="0%" stopColor="#FAF7F2" />
          <stop offset="60%" stopColor="#F0EBE3" />
          <stop offset="100%" stopColor="#DDD6CA" />
        </radialGradient>
        <radialGradient id="mallard-body-grad" cx="0.48" cy="0.38" r="0.55">
          <stop offset="0%" stopColor="#A8A098" />
          <stop offset="60%" stopColor="#8E8680" />
          <stop offset="100%" stopColor="#726B64" />
        </radialGradient>
        <radialGradient id="head-grad" cx="0.46" cy="0.38" r="0.55">
          <stop offset="0%" stopColor="white" />
          <stop offset="50%" stopColor="#F5F1EB" />
          <stop offset="100%" stopColor="#E4DED4" />
        </radialGradient>
        <radialGradient id="mallard-head-grad" cx="0.46" cy="0.38" r="0.55">
          <stop offset="0%" stopColor="#2D6B4A" />
          <stop offset="50%" stopColor="#1B5E3A" />
          <stop offset="100%" stopColor="#0F4028" />
        </radialGradient>
        <linearGradient id="beak-grad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#F0B848" />
          <stop offset="100%" stopColor="#D89028" />
        </linearGradient>
        <linearGradient id="mallard-beak-grad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#C8A830" />
          <stop offset="100%" stopColor="#A08020" />
        </linearGradient>
      </defs>
      <ellipse
        cx={24}
        cy={27}
        rx={7.5}
        ry={6}
        fill="#1a4a65"
        opacity={0.08}
        filter="url(#duck-shadow)"
      />
      {paddling ? <PaddleFeet /> : null}
      <ellipse cx={24} cy={26} rx={7} ry={8.5} fill={`url(#${bodyGrad})`} />
      <circle cx={24} cy={15.2} r={3.2} fill={`url(#${headGrad})`} />
      <circle cx={21.3} cy={15} r={0.6} fill="#1a1a1a" />
      <circle cx={26.7} cy={15} r={0.6} fill="#1a1a1a" />
      <path
        d="M20.8 13.5 Q20.2 11.5, 21.5 10 Q24 8.5, 26.5 10 Q27.8 11.5, 27.2 13.5"
        fill={`url(#${beakGrad})`}
      />
      <path d="M22 34 Q24 38, 26 34" fill={mallard ? "#6A6258" : "#E0D8CC"} />
    </svg>
  );
});
