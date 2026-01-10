import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * TooltipProvider - Wraps tooltip components and provides global configuration
 * 
 * @param delayDuration - Delay in ms before tooltip shows on hover (default: 300ms for desktop)
 * @param skipDelayDuration - Time in ms to skip delay when moving between tooltips (default: 300ms)
 */
function TooltipProvider({
  delayDuration = 300,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

interface TooltipProps extends React.ComponentProps<typeof TooltipPrimitive.Root> {
  /**
   * Mobile behavior: show on tap, auto-dismiss after 5s or tap outside
   * Desktop behavior: show on hover with 300ms delay
   */
  children?: React.ReactNode;
}

/**
 * Enhanced Tooltip component with mobile and desktop support
 * 
 * Desktop: Shows on hover with 300ms delay
 * Mobile: Shows on tap, dismisses after 5s or tap outside
 * 
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>Hover me</TooltipTrigger>
 *   <TooltipContent side="top">Helpful information</TooltipContent>
 * </Tooltip>
 * ```
 */
function Tooltip({
  children,
  delayDuration = 300,
  ...props
}: TooltipProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Handle mobile tap behavior
  React.useEffect(() => {
    if (isMobile && open) {
      // Auto-dismiss after 5 seconds on mobile
      timeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 5000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [isMobile, open]);

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // On mobile, use controlled state for tap behavior
  // On desktop, use default hover behavior
  const tooltipProps = isMobile
    ? {
        open,
        onOpenChange: setOpen,
        delayDuration: 0, // Instant on mobile tap
      }
    : {
        delayDuration, // 300ms delay on desktop hover
      };

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive.Root data-slot="tooltip" {...tooltipProps} {...props}>
        {children}
      </TooltipPrimitive.Root>
    </TooltipProvider>
  );
}

/**
 * TooltipTrigger - The element that triggers the tooltip
 * 
 * @example
 * ```tsx
 * <TooltipTrigger asChild>
 *   <Button>Hover me</Button>
 * </TooltipTrigger>
 * ```
 */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

interface TooltipContentProps extends React.ComponentProps<typeof TooltipPrimitive.Content> {
  /**
   * Preferred side to render the tooltip (auto-adjusts to stay in viewport)
   * @default "top"
   */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Distance in pixels from the trigger
   * @default 4
   */
  sideOffset?: number;
  /**
   * Maximum width of the tooltip content
   */
  maxWidth?: string;
  /**
   * ARIA label for accessibility (recommended for icon-only triggers)
   */
  "aria-label"?: string;
}

/**
 * TooltipContent - The content displayed in the tooltip
 * 
 * Features:
 * - Auto-adjusts position to stay in viewport
 * - Supports top/right/bottom/left positioning
 * - Includes arrow pointer
 * - Accessible with ARIA labels
 * 
 * @example
 * ```tsx
 * <TooltipContent side="top" maxWidth="300px" aria-label="Help text">
 *   This is helpful information
 * </TooltipContent>
 * ```
 */
function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  maxWidth,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        side={side}
        sideOffset={sideOffset}
        avoidCollisions={true}
        collisionPadding={8}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-lg px-3 py-1.5 text-sm text-balance",
          maxWidth && `max-w-[${maxWidth}]`,
          className
        )}
        style={maxWidth ? { maxWidth } : undefined}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
