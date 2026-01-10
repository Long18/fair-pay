/**
 * Swipeable Dialog Component
 * 
 * Enhanced dialog with swipe-to-dismiss functionality for mobile devices.
 * On mobile, users can swipe down to dismiss the dialog.
 * Falls back to standard dialog behavior on desktop.
 * 
 * Usage:
 * ```tsx
 * <SwipeableDialog open={open} onOpenChange={setOpen}>
 *   <SwipeableDialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Title</DialogTitle>
 *     </DialogHeader>
 *     Content here
 *   </SwipeableDialogContent>
 * </SwipeableDialog>
 * ```
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "@/components/ui/icons";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSwipeToDismiss } from "@/hooks/use-touch-interactions";
import { useIsMobile } from "@/hooks/use-mobile";

function SwipeableDialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="swipeable-dialog" {...props} />;
}

function SwipeableDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="swipeable-dialog-trigger" {...props} />;
}

function SwipeableDialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="swipeable-dialog-portal" {...props} />;
}

function SwipeableDialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="swipeable-dialog-close" {...props} />;
}

function SwipeableDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="swipeable-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

interface SwipeableDialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean;
  enableSwipeToDismiss?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SwipeableDialogContent({
  className,
  children,
  showCloseButton = true,
  enableSwipeToDismiss = true,
  onOpenChange,
  ...props
}: SwipeableDialogContentProps) {
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

  const ContentWrapper = shouldEnableSwipe ? motion.div : 'div';
  const wrapperProps = shouldEnableSwipe ? dragProps : {};

  return (
    <SwipeableDialogPortal>
      <SwipeableDialogOverlay style={{ opacity }} />
      <DialogPrimitive.Content
        data-slot="swipeable-dialog-content"
        className={cn(
          "glass bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        asChild={shouldEnableSwipe}
        {...props}
      >
        <ContentWrapper {...wrapperProps}>
          {shouldEnableSwipe && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
          )}
          <div className={shouldEnableSwipe ? "pt-2" : ""}>
            {children}
          </div>
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="swipeable-dialog-close"
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </ContentWrapper>
      </DialogPrimitive.Content>
    </SwipeableDialogPortal>
  );
}

function SwipeableDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="swipeable-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function SwipeableDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="swipeable-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function SwipeableDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="swipeable-dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function SwipeableDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="swipeable-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  SwipeableDialog,
  SwipeableDialogClose,
  SwipeableDialogContent,
  SwipeableDialogDescription,
  SwipeableDialogFooter,
  SwipeableDialogHeader,
  SwipeableDialogOverlay,
  SwipeableDialogPortal,
  SwipeableDialogTitle,
  SwipeableDialogTrigger,
};
