import React, { useRef } from "react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { cn } from "@/lib/utils";
import {
  FairPayIcon,
  WalletIcon,
  BanknoteIcon,
  ScaleIcon,
} from "@/components/ui/icons";

interface BeamNodeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const BeamNode = React.forwardRef<HTMLDivElement, BeamNodeProps>(
  ({ children, className, delay = 0 }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative z-10 flex items-center justify-center rounded-xl border bg-background p-2.5 shadow-sm",
        "animate-beam-node-float",
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  ),
);
BeamNode.displayName = "BeamNode";

interface LoadingBeamProps {
  text?: string;
  className?: string;
}

/**
 * Compact animated beam loading indicator.
 * 3 nodes: left → center (FairPay) → right with beams flowing between them.
 * Use for inline/section loading states (tabs, cards, panels).
 */
export function LoadingBeam({ text, className }: LoadingBeamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-4", className)}>
      <div
        ref={containerRef}
        className="relative flex w-full max-w-xs mx-auto items-center justify-between px-6"
        style={{ minHeight: 80 }}
      >
        <BeamNode ref={leftRef} delay={0} className="size-10">
          <WalletIcon size={16} className="text-primary" />
        </BeamNode>

        <div
          ref={centerRef}
          className="relative z-10 flex items-center justify-center rounded-2xl border-2 border-primary/30 bg-background p-3 shadow-lg animate-beam-pulse"
        >
          <FairPayIcon size={28} className="rounded-md" />
        </div>

        <BeamNode ref={rightRef} delay={0.3} className="size-10">
          <BanknoteIcon size={16} className="text-green-500" />
        </BeamNode>

        <AnimatedBeam
          containerRef={containerRef}
          fromRef={leftRef}
          toRef={centerRef}
          curvature={-0.15}
          duration={2.2}
          delay={0}
          gradientStartColor="#3b82f6"
          gradientStopColor="#6366f1"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={centerRef}
          toRef={rightRef}
          curvature={-0.15}
          duration={2.2}
          delay={0.2}
          gradientStartColor="#22c55e"
          gradientStopColor="#10b981"
        />
      </div>

      {text && (
        <p className="text-sm text-muted-foreground animate-beam-pulse">{text}</p>
      )}
    </div>
  );
}
