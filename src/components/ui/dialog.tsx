"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "@/components/ui/icons";
import * as React from "react";

import { SPRING_OVERLAY } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { cn } from "@/lib/utils";

// Internal context to pass dialog open state down to DialogContent
const DialogOpenContext = React.createContext(false);

function Dialog({
  open,
  onOpenChange,
  defaultOpen,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  // Track open state internally so AnimatePresence works correctly
  const [isOpen, setIsOpen] = React.useState(open ?? defaultOpen ?? false);

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open);
  }, [open]);

  const handleOpenChange = React.useCallback(
    (val: boolean) => {
      if (open === undefined) setIsOpen(val);
      onOpenChange?.(val);
    },
    [open, onOpenChange]
  );

  return (
    <DialogOpenContext.Provider value={isOpen}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DialogOpenContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const isOpen = React.useContext(DialogOpenContext);
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion ? { duration: 0 } : SPRING_OVERLAY;

  return (
    <DialogPortal data-slot="dialog-portal">
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Overlay
            forceMount
            data-slot="dialog-overlay"
            asChild
          >
            <motion.div
              className="fixed inset-0 z-50 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            />
          </DialogPrimitive.Overlay>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Content
            forceMount
            data-slot="dialog-content"
            className={cn(
              "bg-popover fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-lg sm:max-w-lg",
              className
            )}
            asChild
            {...props}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transition}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close
                  data-slot="dialog-close"
                  className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </motion.div>
          </DialogPrimitive.Content>
        )}
      </AnimatePresence>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
