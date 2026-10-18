import { memo } from "react";

export const PersonSvg = memo(function PersonSvg({
  color = "blue",
}: {
  color?: "pink" | "yellow" | "green" | "blue";
}) {
  const ring =
    color === "pink"
      ? "#e8a0b8"
      : color === "yellow"
        ? "#e8c878"
        : color === "green"
          ? "#88c8a0"
          : "#88b8e8";

  return (
    <svg
      width={56}
      height={56}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      <ellipse cx={24} cy={30} rx={9} ry={3} fill="#1a4a65" opacity={0.1} />
      <circle cx={24} cy={16} r={5} fill={ring} opacity={0.9} />
      <path
        d="M18 22 Q24 20 30 22 L28 36 Q24 34 20 36 Z"
        fill={ring}
        opacity={0.75}
      />
      <ellipse cx={24} cy={38} rx={7} ry={2.2} fill="none" stroke={ring} strokeWidth={1.2} opacity={0.5} />
    </svg>
  );
});
