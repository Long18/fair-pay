import type { SVGProps } from "react";

type ShapeProps = SVGProps<SVGSVGElement> & { size?: number };

export function CoinShape({ size = 24, ...props }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.5" fontWeight="bold">$</text>
    </svg>
  );
}

export function ChartLineShape({ size = 24, ...props }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <polyline points="2,18 8,12 14,15 22,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <polyline points="18,6 22,6 22,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

export function CircleShape({ size = 24, ...props }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function DotsShape({ size = 24, ...props }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="4" cy="12" r="2" opacity="0.3" />
      <circle cx="12" cy="12" r="2" opacity="0.2" />
      <circle cx="20" cy="12" r="2" opacity="0.1" />
    </svg>
  );
}

export function HexagonShape({ size = 24, ...props }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke="currentColor" strokeWidth="1" opacity="0.25" />
    </svg>
  );
}

export function WalletShape({ size = 24, ...props }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
