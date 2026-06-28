import React from "react";
import { cn } from "@/lib/utils";
import {
  SURFACE_GLASS,
  SURFACE_GLASS_PRIMARY,
  getPillSizeClasses,
  getPillIconClasses,
  type PillSize,
} from "@/lib/floating-tokens";

/** Props for a single FloatingPill action button. */
export interface FloatingPillProps {
  /** Pill height variant. Default: "default" (48px). */
  size?: PillSize;
  /** Icon element rendered inside the pill. */
  icon?: React.ReactNode;
  /** Optional label rendered to the right of the icon. */
  label?: string;
  /** Click handler. */
  onClick?: () => void;
  /** Renders as an anchor tag if provided. */
  href?: string;
  /** Disables interaction when true. */
  disabled?: boolean;
  /** Shows a small badge with count at top-right. */
  badge?: number | string;
  /** Surface variant. Default: "glass". */
  variant?: "glass" | "primary" | "bare";
  /** Additional class names. */
  className?: string;
  /** Required for icon-only pills (accessibility). */
  ariaLabel?: string;
  /** Optional title for native tooltips. */
  title?: string;
  /** Menu-trigger ARIA attrs. */
  ariaExpanded?: boolean;
  ariaHasPopup?: React.AriaAttributes["aria-haspopup"];
  /** Alternative to icon+label — render arbitrary children. */
  children?: React.ReactNode;
  /** Pass-through data attributes (e.g. data-onboarding-target). */
  dataAttributes?: Record<string, string>;
  // Analytics tracking
  "data-track-id"?: string;
  "data-track-event"?: string;
  "data-track-type"?: string;
  "data-track-category"?: string;
}

const sizeClasses: Record<PillSize, string> = {
  sm: "h-10 min-w-10 px-3 text-sm",
  default: "h-12 min-w-12 px-4 text-sm",
  lg: "h-14 min-w-14 px-5 text-base",
};

/**
 * Rounded-pill action button with glassmorphism surface.
 *
 * Building block for the floating-stack system. Use standalone as a utility
 * FAB, or compose into FloatingPillGroup / FloatingActionStack.
 */
export const FloatingPill = React.forwardRef<HTMLButtonElement, FloatingPillProps>(
  function FloatingPill(
    {
      size = "default",
      icon,
      label,
      onClick,
      href,
      disabled = false,
      badge,
      variant = "glass",
      className,
      ariaLabel,
      title,
      ariaExpanded,
      ariaHasPopup,
      children,
      dataAttributes,
      "data-track-id": trackId,
      "data-track-event": trackEvent,
      "data-track-type": trackType,
      "data-track-category": trackCategory,
    },
    ref
  ) {
    const surface = variant === "primary" ? SURFACE_GLASS_PRIMARY : variant === "bare" ? "" : SURFACE_GLASS;
    const isIconOnly = !!icon && !label && !children;

    const baseClasses = cn(
      "relative inline-flex items-center justify-center gap-2",
      "rounded-full",
      surface,
      sizeClasses[size],
      isIconOnly && "aspect-square !px-0",
      "font-medium whitespace-nowrap",
      "transition-all duration-200 ease-out",
      "hover:scale-105 active:scale-95",
      variant === "glass"
        ? "hover:bg-background/85 hover:shadow-xl"
        : variant === "primary"
        ? "hover:bg-primary hover:shadow-2xl"
        : "",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "select-none cursor-pointer",
      disabled && "opacity-50 pointer-events-none cursor-not-allowed",
      className
    );

    const trackingProps = {
      "data-track-id": trackId,
      "data-track-event": trackEvent ?? (trackId ? "cta_click" : undefined),
      "data-track-type": trackType ?? (trackId ? "button" : undefined),
      "data-track-category": trackCategory,
    };

    const iconClasses = getPillIconClasses(size);

    const inner = (
      <>
        {children ?? (
          <>
            {icon && (
              <span className={cn("flex items-center justify-center shrink-0", iconClasses)}>
                {icon}
              </span>
            )}
            {label && (
              <span className="leading-none">{label}</span>
            )}
          </>
        )}

        {badge != null && badge !== 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1",
              "flex items-center justify-center",
              "h-5 min-w-5 rounded-full px-1",
              "bg-destructive text-destructive-foreground",
              "text-[10px] font-bold leading-none",
              "border-2 border-background shadow-sm"
            )}
            aria-label={typeof badge === "number" ? `${badge} notifications` : undefined}
          >
            {typeof badge === "number" && badge > 99 ? "99+" : badge}
          </span>
        )}
      </>
    );

    if (href) {
      return (
        <a
          href={href}
          className={baseClasses}
          aria-label={ariaLabel ?? label}
          aria-disabled={disabled}
          title={title}
          {...trackingProps}
          {...(dataAttributes ?? {})}
        >
          {inner}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={baseClasses}
        aria-label={ariaLabel ?? label}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        title={title}
        {...trackingProps}
        {...(dataAttributes ?? {})}
      >
        {inner}
      </button>
    );
  }
);
