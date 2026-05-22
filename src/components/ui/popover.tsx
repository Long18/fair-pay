"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { SPRING_DEFAULT } from "@/lib/animation";
import { cn } from "@/lib/utils";

const PopoverOpenContext = React.createContext(false);

function Popover({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <PopoverOpenContext.Provider value={open}>
      <PopoverPrimitive.Root
        data-slot="popover"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </PopoverOpenContext.Provider>
  );
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const open = React.useContext(PopoverOpenContext);
  const reducedMotion = useReducedMotion();

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        forceMount
        className={cn(
          "bg-popover text-popover-foreground z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        {...props}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              key="popover-content"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reducedMotion ? {} : { opacity: 0, scale: 0.96, y: -4 }}
              transition={SPRING_DEFAULT}
              style={{ display: "contents" }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
