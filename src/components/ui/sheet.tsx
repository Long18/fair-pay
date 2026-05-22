"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "@/components/ui/icons";
import * as React from "react";

import { SPRING_OVERLAY } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { cn } from "@/lib/utils";

// Internal context to pass sheet open state down to SheetContent
const SheetOpenContext = React.createContext(false);

function Sheet({
  open,
  onOpenChange,
  defaultOpen,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
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
    <SheetOpenContext.Provider value={isOpen}>
      <SheetPrimitive.Root
        data-slot="sheet"
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </SheetOpenContext.Provider>
  );
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  );
}

const SLIDE_INITIAL: Record<string, { x?: string; y?: string }> = {
  right: { x: "100%" },
  left: { x: "-100%" },
  top: { y: "-100%" },
  bottom: { y: "100%" },
};

const SLIDE_ANIMATE: Record<string, { x?: number; y?: number }> = {
  right: { x: 0 },
  left: { x: 0 },
  top: { y: 0 },
  bottom: { y: 0 },
};

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  const isOpen = React.useContext(SheetOpenContext);
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion ? { duration: 0 } : SPRING_OVERLAY;

  return (
    <SheetPortal>
      <AnimatePresence>
        {isOpen && (
          <SheetPrimitive.Overlay forceMount data-slot="sheet-overlay" asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            />
          </SheetPrimitive.Overlay>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <SheetPrimitive.Content
            forceMount
            data-slot="sheet-content"
            className={cn(
              "bg-background fixed z-50 flex flex-col gap-4 shadow-lg",
              side === "right" &&
                "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
              side === "left" &&
                "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
              side === "top" && "inset-x-0 top-0 h-auto border-b",
              side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
              className
            )}
            asChild
            {...props}
          >
            <motion.div
              initial={SLIDE_INITIAL[side]}
              animate={SLIDE_ANIMATE[side]}
              exit={SLIDE_INITIAL[side]}
              transition={transition}
            >
              {children}
              <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </SheetPrimitive.Close>
            </motion.div>
          </SheetPrimitive.Content>
        )}
      </AnimatePresence>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
