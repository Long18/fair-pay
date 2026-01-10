/**
 * Swipeable Sheet Component
 * 
 * Enhanced sheet with swipe-to-dismiss functionality for mobile devices.
 * On mobile, users can swipe down (for top/bottom sheets) or swipe in the 
 * direction of the sheet's origin to dismiss.
 * 
 * Usage:
 * ```tsx
 * <SwipeableSheet open={open} onOpenChange={setOpen}>
 *   <SwipeableSheetContent side="bottom">
 *     <SheetHeader>
 *       <SheetTitle>Title</SheetTitle>
 *     </SheetHeader>
 *     Content here
 *   </SwipeableSheetContent>
 * </SwipeableSheet>
 * ```
 */

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "@/components/ui/icons";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSwipeToDismiss } from "@/hooks/use-touch-interactions";
import { useIsMobile } from "@/hooks/use-mobile";

function SwipeableSheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="swipeable-sheet" {...props} />;
}

function SwipeableSheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="swipeable-sheet-trigger" {...props} />;
}

function SwipeableSheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="swipeable-sheet-close" {...props} />;
}

function SwipeableSheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="swipeable-sheet-portal" {...props} />;
}

function SwipeableSheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="swipeable-sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

interface SwipeableSheetContentProps extends React.ComponentProps<typeof SheetPrimitive.Content> {
  side?: "top" | "right" | "bottom" | "left";
  enableSwipeToDismiss?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SwipeableSheetContent({
  className,
  children,
  side = "right",
  enableSwipeToDismiss = true,
  onOpenChange,
  ...props
}: SwipeableSheetContentProps) {
  const isMobile = useIsMobile();
  const shouldEnableSwipe = isMobile && enableSwipeToDismiss;

  const handleDismiss = React.useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const { isDragging, dragY, dragProps } = useSwipeToDismiss(handleDismiss, 100);

  // Calculate opacity based on drag distance
  const opacity = shouldEnableSwipe && isDragging 
    ? Math.max(0.3, 1 - dragY / 300) 
    : 1;

  const sheetVariants = {
    top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
    bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
    left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
    right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
  };

  const ContentWrapper = shouldEnableSwipe && (side === "bottom" || side === "top") ? motion.div : 'div';
  const wrapperProps = shouldEnableSwipe && (side === "bottom" || side === "top") ? dragProps : {};

  return (
    <SwipeableSheetPortal>
      <SwipeableSheetOverlay style={{ opacity }} />
      <SheetPrimitive.Content
        data-slot="swipeable-sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          sheetVariants[side],
          className
        )}
        asChild={shouldEnableSwipe && (side === "bottom" || side === "top")}
        {...props}
      >
        <ContentWrapper {...wrapperProps}>
          {shouldEnableSwipe && (side === "bottom" || side === "top") && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
          )}
          <div className={cn(
            "flex-1 overflow-auto",
            shouldEnableSwipe && (side === "bottom" || side === "top") && "pt-6"
          )}>
            {children}
          </div>
          <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none min-h-[44px] min-w-[44px] flex items-center justify-center">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </ContentWrapper>
      </SheetPrimitive.Content>
    </SwipeableSheetPortal>
  );
}

function SwipeableSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="swipeable-sheet-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left px-6", className)}
      {...props}
    />
  );
}

function SwipeableSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="swipeable-sheet-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-6 pb-6",
        className
      )}
      {...props}
    />
  );
}

function SwipeableSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="swipeable-sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function SwipeableSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="swipeable-sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  SwipeableSheet,
  SwipeableSheetClose,
  SwipeableSheetContent,
  SwipeableSheetDescription,
  SwipeableSheetFooter,
  SwipeableSheetHeader,
  SwipeableSheetOverlay,
  SwipeableSheetPortal,
  SwipeableSheetTitle,
  SwipeableSheetTrigger,
};
