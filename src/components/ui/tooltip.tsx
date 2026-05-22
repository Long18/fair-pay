import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";

const TooltipMobileContext = React.createContext<{
  isMobile: boolean;
  onTriggerClick: () => void;
}>({
  isMobile: false,
  onTriggerClick: () => {},
});

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
  open: openProp,
  onOpenChange,
  ...props
}: TooltipProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isControlled = openProp !== undefined;
  const resolvedOpen = isControlled ? openProp : mobileOpen;

  React.useEffect(() => {
    if (isMobile && resolvedOpen && !isControlled) {
      timeoutRef.current = setTimeout(() => {
        setMobileOpen(false);
      }, 5000);

      const handleDocumentClick = (event: MouseEvent) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (
          target?.closest("[data-slot='tooltip-trigger']") ||
          target?.closest("[data-slot='tooltip-content']")
        ) {
          return;
        }

        setMobileOpen(false);
      };

      document.addEventListener("click", handleDocumentClick);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        document.removeEventListener("click", handleDocumentClick);
      };
    }
  }, [isControlled, isMobile, resolvedOpen]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (isMobile && !isControlled) {
        setMobileOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, isMobile, onOpenChange]
  );

  const mobileContext = React.useMemo(
    () => ({
      isMobile,
      onTriggerClick: () => handleOpenChange(!resolvedOpen),
    }),
    [handleOpenChange, isMobile, resolvedOpen]
  );

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipMobileContext.Provider value={mobileContext}>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          {...(isMobile || isControlled ? { open: resolvedOpen } : {})}
          onOpenChange={handleOpenChange}
          delayDuration={isMobile ? 0 : delayDuration}
          {...props}
        >
          {children}
        </TooltipPrimitive.Root>
      </TooltipMobileContext.Provider>
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
  onClick,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const { isMobile, onTriggerClick } = React.useContext(TooltipMobileContext);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isMobile) {
        onTriggerClick();
      }

      onClick?.(event);
    },
    [isMobile, onClick, onTriggerClick]
  );

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onClick={handleClick}
      {...props}
    />
  );
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
          "bg-primary text-primary-foreground data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:zoom-in-95 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-lg px-3 py-1.5 text-sm text-balance",
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
