import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  HOVER_SCALE,
  TAP_SCALE,
  SPRING_DEFAULT,
  RIPPLE_DURATION,
} from "@/lib/animation";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CVA variants — kept 100 % identical to original
// ---------------------------------------------------------------------------

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// ---------------------------------------------------------------------------
// RippleEffect sub-component
// ---------------------------------------------------------------------------

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

function RippleEffect({
  ripples,
  onComplete,
}: {
  ripples: RippleItem[];
  onComplete: (id: number) => void;
}) {
  return (
    <>
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="pointer-events-none absolute block rounded-full bg-current"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 8,
            height: 8,
            marginLeft: -4,
            marginTop: -4,
          }}
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 10, opacity: 0 }}
          transition={{ duration: RIPPLE_DURATION, ease: "easeOut" }}
          onAnimationComplete={() => onComplete(ripple.id)}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    ripple?: boolean;
    disableHoverScale?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ripple = true,
  disableHoverScale = false,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const [ripples, setRipples] = React.useState<RippleItem[]>([]);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !prefersReducedMotion) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setRipples((prev) => [...prev, { id, x, y }]);
      }
      onClick?.(e);
    },
    [ripple, prefersReducedMotion, onClick]
  );

  const removeRipple = React.useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const baseClass = cn(
    buttonVariants({ variant, size, className }),
    (ripple && !prefersReducedMotion) ? "relative overflow-hidden" : undefined
  );

  if (asChild) {
    // When asChild, wrap Slot with motion
    const MotionSlot = motion.create(Slot);
    const motionProps = prefersReducedMotion
      ? {}
      : {
          whileHover: disableHoverScale ? undefined : { scale: HOVER_SCALE },
          whileTap: { scale: TAP_SCALE },
          transition: SPRING_DEFAULT,
        };

    return (
      <MotionSlot
        data-slot="button"
        className={baseClass}
        {...(motionProps as object)}
        {...(props as object)}
      >
        {children}
        <RippleEffect ripples={ripples} onComplete={removeRipple} />
      </MotionSlot>
    );
  }

  const motionProps: Partial<HTMLMotionProps<"button">> = prefersReducedMotion
    ? {}
    : {
        whileHover: disableHoverScale ? undefined : { scale: HOVER_SCALE },
        whileTap: { scale: TAP_SCALE },
        transition: SPRING_DEFAULT,
      };

  return (
    <motion.button
      data-slot="button"
      className={baseClass}
      onClick={handleClick}
      {...motionProps}
      {...(props as HTMLMotionProps<"button">)}
    >
      {children}
      {ripple && !prefersReducedMotion && (
        <RippleEffect ripples={ripples} onComplete={removeRipple} />
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// FlipButton
// ---------------------------------------------------------------------------

interface FlipButtonProps extends VariantProps<typeof buttonVariants> {
  front: React.ReactNode;
  back: React.ReactNode;
  direction?: "top" | "bottom";
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

function FlipButton({
  front,
  back,
  direction = "bottom",
  variant,
  size,
  className,
  onClick,
}: FlipButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);

  const exitY = direction === "bottom" ? "-100%" : "100%";
  const enterY = direction === "bottom" ? "100%" : "-100%";

  return (
    <motion.button
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        "relative overflow-hidden"
      )}
      style={{ perspective: 600 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Front face */}
      <motion.span
        className="flex items-center justify-center"
        animate={
          prefersReducedMotion
            ? {}
            : hovered
            ? { y: exitY, opacity: 0 }
            : { y: "0%", opacity: 1 }
        }
        transition={SPRING_DEFAULT}
      >
        {front}
      </motion.span>

      {/* Back face */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={{ y: enterY, opacity: 0 }}
        animate={
          prefersReducedMotion
            ? {}
            : hovered
            ? { y: "0%", opacity: 1 }
            : { y: enterY, opacity: 0 }
        }
        transition={SPRING_DEFAULT}
      >
        {back}
      </motion.span>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// LiquidButton
// ---------------------------------------------------------------------------

interface LiquidButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  className?: string;
  fillColor?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

function LiquidButton({
  children,
  variant,
  size,
  className,
  fillColor = "rgba(currentColor, 0.15)",
  onClick,
}: LiquidButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.button
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        "relative overflow-hidden"
      )}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Liquid fill layer */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: fillColor,
          transformOrigin: "bottom",
          originY: 1,
        }}
        initial={{ scaleY: 0 }}
        animate={
          prefersReducedMotion
            ? {}
            : hovered
            ? { scaleY: 1 }
            : { scaleY: 0 }
        }
        transition={SPRING_DEFAULT}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Button, buttonVariants, FlipButton, LiquidButton };
