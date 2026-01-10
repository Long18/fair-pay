/**
 * Touch Target Component
 * 
 * Ensures interactive elements meet minimum touch target size requirements (44x44px).
 * Wraps children with proper sizing and spacing for mobile accessibility.
 * 
 * Usage:
 * ```tsx
 * <TouchTarget>
 *   <button>Click me</button>
 * </TouchTarget>
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface TouchTargetProps {
  children: React.ReactNode;
  className?: string;
  minSize?: number;
  asChild?: boolean;
}

/**
 * TouchTarget component ensures minimum touch target size
 * Default minimum size is 44x44px per WCAG guidelines
 */
export function TouchTarget({
  children,
  className,
  minSize = 44,
  asChild = false,
}: TouchTargetProps) {
  const minSizeClass = `min-h-[${minSize}px] min-w-[${minSize}px]`;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      className: cn(minSizeClass, "flex items-center justify-center", (children.props as any).className),
    });
  }

  return (
    <div className={cn(minSizeClass, "flex items-center justify-center", className)}>
      {children}
    </div>
  );
}

/**
 * Hook to get touch target class names
 * Returns className string with minimum touch target size
 */
export function useTouchTargetClass(minSize: number = 44): string {
  return `min-h-[${minSize}px] min-w-[${minSize}px]`;
}

/**
 * Utility function to ensure touch target spacing
 * Returns gap class for proper spacing between touch targets
 */
export function getTouchTargetSpacing(spacing: number = 8): string {
  return `gap-${Math.ceil(spacing / 4)}`;
}
