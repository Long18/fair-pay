import { type HTMLMotionProps, motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { SPRING_GENTLE } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col gap-0 rounded-xl border py-0 shadow-none",
  {
    variants: {
      elevation: {
        flat: "",
        elevated: "shadow-sm",
        interactive: "shadow-sm transition-shadow hover:shadow-md",
      },
    },
    defaultVariants: {
      elevation: "flat",
    },
  }
);

interface CardProps
  extends HTMLMotionProps<"div">,
    VariantProps<typeof cardVariants> {
  /** Lift + shadow on hover (uses elevation `interactive` when set). */
  interactive?: boolean;
  /** List-in-card layout: vertical padding on shell, header/content px tuned in children. */
  flushList?: boolean;
}

function Card({
  className,
  elevation,
  interactive = false,
  flushList = false,
  ...props
}: CardProps) {
  const reducedMotion = useReducedMotion();
  const resolvedElevation = interactive ? "interactive" : elevation;

  const motionProps =
    interactive && !reducedMotion
      ? {
          whileHover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
          transition: SPRING_GENTLE,
        }
      : {};

  return (
    <motion.div
      data-slot="card"
      data-flush-list={flushList ? "true" : undefined}
      className={cn(
        cardVariants({ elevation: resolvedElevation }),
        flushList && "group/card py-5",
        className
      )}
      {...motionProps}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5 pt-5 pb-0",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:mb-0 [.border-b]:border-b [.border-b]:border-border/60 [.border-b]:pb-4",
        "mb-4 group-data-[flush-list]/card:mb-1.5 group-data-[flush-list]/card:has-data-[slot=card-action]:mb-0",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-semibold leading-none text-balance", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end shrink-0",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-5 py-4 last:pb-5",
        "group-data-[flush-list]/card:px-2 group-data-[flush-list]/card:py-0 group-data-[flush-list]/card:last:pb-0",
        className
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 px-5 pb-5 pt-4",
        "[.border-t]:border-t [.border-t]:border-border/60 [.border-t]:pt-4",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
};
