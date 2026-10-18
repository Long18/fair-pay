import { memo } from "react";

export const FishSvg = memo(function FishSvg({
  size = 48,
  burst = false,
}: {
  size?: number;
  burst?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id="fish-body-grad" cx="0.45" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#F4A460" />
          <stop offset="60%" stopColor="#E8913A" />
          <stop offset="100%" stopColor="#D07828" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="24" rx="4" ry="8" fill="url(#fish-body-grad)" />
      <path
        d={burst ? "M24 31 L19 36 L29 36 Z" : "M24 31 L21 35 L27 35 Z"}
        fill="#D07828"
        opacity={0.85}
      />
      <circle cx="22.5" cy="19" r="1.2" fill="#2A2520" />
      <circle cx="22.2" cy="18.7" r="0.4" fill="white" opacity={0.7} />
    </svg>
  );
});
