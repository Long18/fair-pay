import React, { useRef } from "react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { cn } from "@/lib/utils";
import {
  FairPayIcon,
  UsersIcon,
  WalletIcon,
  BanknoteIcon,
  ReceiptIcon,
  HandCoinsIcon,
  ScaleIcon,
} from "@/components/ui/icons";
import { useTranslation } from "react-i18next";

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
        "relative z-10 flex items-center justify-center rounded-xl border bg-background p-3 shadow-sm",
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

export function DashboardLoadingBeam() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const topLeftRef = useRef<HTMLDivElement>(null);
  const topRightRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const bottomLeftRef = useRef<HTMLDivElement>(null);
  const bottomRightRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div
        ref={containerRef}
        className="relative flex w-full max-w-md mx-auto items-center justify-center p-10"
        style={{ minHeight: 320 }}
      >
        {/* Left column */}
        <div className="flex flex-col gap-8 items-center">
          <BeamNode ref={topLeftRef} delay={0} className="size-12">
            <UsersIcon size={20} className="text-primary" />
          </BeamNode>
          <BeamNode ref={leftRef} delay={0.4} className="size-12">
            <WalletIcon size={20} className="text-primary" />
          </BeamNode>
          <BeamNode ref={bottomLeftRef} delay={0.8} className="size-12">
            <ReceiptIcon size={20} className="text-muted-foreground" />
          </BeamNode>
        </div>

        {/* Center - FairPay logo */}
        <div className="flex items-center justify-center mx-12 md:mx-16">
          <div
            ref={centerRef}
            className="relative z-10 flex items-center justify-center rounded-2xl border-2 border-primary/30 bg-background p-4 shadow-lg animate-beam-pulse"
          >
            <FairPayIcon size={40} className="rounded-lg" />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-8 items-center">
          <BeamNode ref={topRightRef} delay={0.2} className="size-12">
            <BanknoteIcon size={20} className="text-green-500" />
          </BeamNode>
          <BeamNode ref={rightRef} delay={0.6} className="size-12">
            <HandCoinsIcon size={20} className="text-amber-500" />
          </BeamNode>
          <BeamNode ref={bottomRightRef} delay={1.0} className="size-12">
            <ScaleIcon size={20} className="text-muted-foreground" />
          </BeamNode>
        </div>

        {/* Beams: left nodes → center */}
        <AnimatedBeam containerRef={containerRef} fromRef={topLeftRef} toRef={centerRef} curvature={-0.2} duration={2.5} delay={0} gradientStartColor="var(--primary, oklch(0.598 0.365 217.2))" gradientStopColor="var(--chart-1, oklch(0.598 0.365 217.2))" />
        <AnimatedBeam containerRef={containerRef} fromRef={leftRef} toRef={centerRef} curvature={0} duration={2.8} delay={0.3} gradientStartColor="var(--primary, oklch(0.598 0.365 217.2))" gradientStopColor="var(--chart-2, oklch(0.678 0.376 213.1))" />
        <AnimatedBeam containerRef={containerRef} fromRef={bottomLeftRef} toRef={centerRef} curvature={0.2} duration={2.6} delay={0.6} gradientStartColor="var(--chart-1, oklch(0.598 0.365 217.2))" gradientStopColor="var(--chart-2, oklch(0.678 0.376 213.1))" />

        {/* Beams: center → right nodes */}
        <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={topRightRef} curvature={-0.2} duration={2.5} delay={0.1} gradientStartColor="var(--chart-positive, oklch(0.65 0.17 155))" gradientStopColor="var(--status-success, oklch(0.65 0.15 160))" />
        <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={rightRef} curvature={0} duration={2.8} delay={0.4} gradientStartColor="var(--status-warning, oklch(0.75 0.15 80))" gradientStopColor="var(--chart-5, oklch(0.75 0.15 80))" />
        <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={bottomRightRef} curvature={0.2} duration={2.6} delay={0.7} gradientStartColor="var(--chart-2, oklch(0.678 0.376 213.1))" gradientStopColor="var(--chart-1, oklch(0.598 0.365 217.2))" />
      </div>

      {/* Loading text */}
      <p className="text-sm text-muted-foreground animate-beam-pulse">
        {t("dashboard.loading", "Đang tải dữ liệu...")}
      </p>
    </div>
  );
}
