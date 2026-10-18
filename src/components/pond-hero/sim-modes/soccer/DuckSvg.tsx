import { memo, useEffect, useId, useState } from "react";

type PartProps = { mallard: boolean };
type GradIds = { body: string; head: string; beak: string };

function Tail({ mallard }: PartProps) {
  return (
    <g>
      <path d="M22 34 Q24 38, 26 34" fill={mallard ? "#6A6258" : "#E0D8CC"} />
      <path d="M23 34 Q24 36.5, 25 34" fill={mallard ? "#7A7268" : "#E8E2D8"} />
    </g>
  );
}

function Body({ mallard, ids }: PartProps & { ids: GradIds }) {
  const shade = mallard ? "#605850" : "#C4BAA8";
  return (
    <g>
      <ellipse cx="24" cy="26" rx="7" ry="8.5" fill={`url(#${ids.body})`} />
      <path
        d="M17.5 28 Q20 34, 24 35 Q28 34, 30.5 28"
        fill={mallard ? "#5A5450" : "#C8C0B0"}
        opacity="0.35"
      />
      <path d="M17.2 22 Q16.8 27, 17.8 32" fill="none" stroke={shade} strokeWidth="2" opacity="0.12" />
      <path d="M30.8 22 Q31.2 27, 30.2 32" fill="none" stroke={shade} strokeWidth="2" opacity="0.12" />
      <ellipse cx="23" cy="23" rx="2.5" ry="3" fill="white" opacity={mallard ? 0.12 : 0.2} />
      <path d="M30 22 Q31 26, 30 30" fill="none" stroke="white" strokeWidth="0.5" opacity="0.08" />
      <ellipse
        cx="24"
        cy="26"
        rx="7"
        ry="8.5"
        fill="none"
        stroke={mallard ? "#6A6258" : "#B8B0A0"}
        strokeWidth="0.35"
        opacity="0.18"
      />
    </g>
  );
}

function Wings({ mallard }: PartProps) {
  const fill = mallard ? "#7A7268" : "#E8E2D8";
  const under = mallard ? "#5A5248" : "#C4BAA8";
  const feather = mallard ? "#6A6258" : "#CCC4B4";
  const featherLight = mallard ? "#7A7268" : "#D4CCC0";
  const outline = mallard ? "#5A5248" : "#B8B0A0";
  return (
    <g>
      <path d="M17.5 22 Q16 26.5, 17.5 32 Q19.5 27.5, 17.5 22Z" fill={under} opacity="0.15" />
      <path d="M17 21 Q15.5 26.5, 17 32.5 Q19.5 27, 17 21Z" fill={fill} />
      <path d="M17.2 21.5 Q19 21, 19.2 22" fill="none" stroke="white" strokeWidth="0.4" opacity="0.15" />
      <path d="M17.8 23 Q17 26.5, 17.8 30" fill="none" stroke={feather} strokeWidth="0.4" opacity="0.3" />
      <path d="M18.3 24 Q17.5 27, 18.3 29" fill="none" stroke={featherLight} strokeWidth="0.3" opacity="0.22" />
      <path d="M17 21 Q15.5 26.5, 17 32.5" fill="none" stroke={outline} strokeWidth="0.35" opacity="0.25" />
      <path d="M30.5 22 Q32 26.5, 30.5 32 Q28.5 27.5, 30.5 22Z" fill={under} opacity="0.15" />
      <path d="M31 21 Q32.5 26.5, 31 32.5 Q28.5 27, 31 21Z" fill={fill} />
      <path d="M30.8 21.5 Q29 21, 28.8 22" fill="none" stroke="white" strokeWidth="0.4" opacity="0.15" />
      <path d="M30.2 23 Q31 26.5, 30.2 30" fill="none" stroke={feather} strokeWidth="0.4" opacity="0.3" />
      <path d="M29.7 24 Q30.5 27, 29.7 29" fill="none" stroke={featherLight} strokeWidth="0.3" opacity="0.22" />
      <path d="M31 21 Q32.5 26.5, 31 32.5" fill="none" stroke={outline} strokeWidth="0.35" opacity="0.25" />
    </g>
  );
}

function Head({ mallard, ids }: PartProps & { ids: GradIds }) {
  const dark = mallard ? "#0A3020" : "#C8C0B2";
  return (
    <g>
      <ellipse cx="24" cy="19.5" rx="3" ry="1.2" fill={mallard ? "#0F4028" : "#C4BAA8"} opacity="0.2" />
      <ellipse cx="24" cy="18.5" rx="2.3" ry="1.5" fill={mallard ? "#E8E4DC" : "#EDE8E0"} />
      <ellipse cx="24" cy="17.5" rx="2.8" ry="0.8" fill={mallard ? "#0A3020" : "#C8C0B2"} opacity="0.15" />
      <circle cx="24" cy="15.2" r="3.2" fill={`url(#${ids.head})`} />
      <circle cx="23" cy="14" r="1.2" fill={mallard ? "#4AE88A" : "white"} opacity={mallard ? 0.2 : 0.25} />
      <path d="M21 13.5 Q20.7 15.2, 21.3 16.5" fill="none" stroke={dark} strokeWidth="0.8" opacity="0.2" />
      <path d="M27 13.5 Q27.3 15.2, 26.7 16.5" fill="none" stroke={dark} strokeWidth="0.8" opacity="0.2" />
      <circle
        cx="24"
        cy="15.2"
        r="3.2"
        fill="none"
        stroke={mallard ? "#0A3020" : "#B8B0A2"}
        strokeWidth="0.3"
        opacity="0.2"
      />
      <circle cx="21.3" cy="15" r="0.6" fill="#1a1a1a" />
      <circle cx="26.7" cy="15" r="0.6" fill="#1a1a1a" />
      <circle cx="21.5" cy="14.8" r="0.2" fill="white" opacity="0.6" />
      <circle cx="26.9" cy="14.8" r="0.2" fill="white" opacity="0.6" />
    </g>
  );
}

const BEAK_PATH = "M20.8 13.5 Q20.2 11.5, 21.5 10 Q24 8.5, 26.5 10 Q27.8 11.5, 27.2 13.5";

function Beak({ mallard, ids }: PartProps & { ids: GradIds }) {
  const line = mallard ? "#806818" : "#B07020";
  return (
    <g>
      <path d="M21 13.2 Q24 14, 27 13.2" fill={mallard ? "#0A3020" : "#C4BAA8"} opacity="0.15" />
      <path d={BEAK_PATH} fill={`url(#${ids.beak})`} />
      <path d="M22.5 10.5 Q24 9.5, 25.5 10.5" fill="white" opacity="0.15" />
      <path d={BEAK_PATH} fill="none" stroke={line} strokeWidth="0.35" opacity="0.35" />
      <ellipse cx="23" cy="11" rx="0.4" ry="0.2" fill={line} opacity="0.3" />
      <ellipse cx="25" cy="11" rx="0.4" ry="0.2" fill={line} opacity="0.3" />
      <path d="M23 9.8 Q24 8.9, 25 9.8" fill={line} opacity="0.25" />
    </g>
  );
}

const FOOT_PATH = "M-0.8 0 L-1.5 2 L-0.3 1.5 L0.5 2.5 L1.3 1.5 L2.5 2 L1.8 0Z";

function PaddleFeet() {
  const [left, setLeft] = useState(() => Math.random() > 0.5);
  useEffect(() => {
    const id = setInterval(() => setLeft((v) => !v), 250);
    return () => clearInterval(id);
  }, []);
  const x = left ? 26 : 21.5;
  return (
    <g opacity="0.35">
      <line x1={x + 0.5} y1="33" x2={x + 0.5} y2="36" stroke="#E8A030" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <g transform={`translate(${x}, 35.5)`}>
        <path d={FOOT_PATH} fill="#E8A030" />
        <path d={FOOT_PATH} fill="none" stroke="#C07820" strokeWidth="0.2" opacity="0.5" />
      </g>
    </g>
  );
}

/**
 * Full-detail duck from the original site (module 673442). Renders an SVG `<g>`
 * for a 48×48 viewBox; the project-level `DuckSvg` is a simplified variant.
 */
export const SoccerDuckSvg = memo(function SoccerDuckSvg({
  paddling = false,
  mallard = false,
}: {
  paddling?: boolean;
  mallard?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const shadowId = `soccer-duck-shadow-${uid}`;
  const ids: GradIds = {
    body: `soccer-duck-body-${uid}`,
    head: `soccer-duck-head-${uid}`,
    beak: `soccer-duck-beak-${uid}`,
  };
  return (
    <g>
      <defs>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
        {mallard ? (
          <>
            <radialGradient id={ids.body} cx="0.48" cy="0.38" r="0.55">
              <stop offset="0%" stopColor="#A8A098" />
              <stop offset="60%" stopColor="#8E8680" />
              <stop offset="100%" stopColor="#726B64" />
            </radialGradient>
            <radialGradient id={ids.head} cx="0.46" cy="0.38" r="0.55">
              <stop offset="0%" stopColor="#2D6B4A" />
              <stop offset="50%" stopColor="#1B5E3A" />
              <stop offset="100%" stopColor="#0F4028" />
            </radialGradient>
            <linearGradient id={ids.beak} x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#C8A830" />
              <stop offset="100%" stopColor="#A08020" />
            </linearGradient>
          </>
        ) : (
          <>
            <radialGradient id={ids.body} cx="0.48" cy="0.38" r="0.55">
              <stop offset="0%" stopColor="#FAF7F2" />
              <stop offset="60%" stopColor="#F0EBE3" />
              <stop offset="100%" stopColor="#DDD6CA" />
            </radialGradient>
            <radialGradient id={ids.head} cx="0.46" cy="0.38" r="0.55">
              <stop offset="0%" stopColor="white" />
              <stop offset="50%" stopColor="#F5F1EB" />
              <stop offset="100%" stopColor="#E4DED4" />
            </radialGradient>
            <linearGradient id={ids.beak} x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#F0B848" />
              <stop offset="100%" stopColor="#D89028" />
            </linearGradient>
          </>
        )}
      </defs>
      <ellipse cx="24" cy="27" rx="10" ry="7.5" fill="none" stroke="#1a4a65" strokeWidth="0.4" opacity="0.06" />
      <ellipse cx="24" cy="27" rx="11.5" ry="8.5" fill="none" stroke="#1a4a65" strokeWidth="0.25" opacity="0.04" />
      <ellipse cx="24.5" cy="28" rx="7.5" ry="6" fill="#1a4a65" opacity="0.08" filter={`url(#${shadowId})`} />
      {paddling ? <PaddleFeet /> : null}
      <Tail mallard={mallard} />
      <Body mallard={mallard} ids={ids} />
      <Wings mallard={mallard} />
      <Head mallard={mallard} ids={ids} />
      <Beak mallard={mallard} ids={ids} />
      <ellipse cx="22" cy="22" rx="4" ry="5" fill="white" opacity="0.06" />
    </g>
  );
});
