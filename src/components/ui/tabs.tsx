"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { SPRING_DEFAULT } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

// Context to share the active tab value and a unique layout id down to triggers
type TabsContextValue = {
  activeValue: string | undefined;
  layoutId: string;
};

const TabsContext = React.createContext<TabsContextValue>({
  activeValue: undefined,
  layoutId: "",
});

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeValue = value ?? internalValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      setInternalValue(next);
      onValueChange?.(next);
    },
    [onValueChange]
  );

  const layoutId = React.useId();
  const ctx = React.useMemo(
    () => ({ activeValue, layoutId }),
    [activeValue, layoutId]
  );

  return (
    <TabsContext.Provider value={ctx}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { activeValue, layoutId } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId={`tab-indicator-${layoutId}`}
          className="absolute inset-0 rounded-md"
          transition={SPRING_DEFAULT}
          aria-hidden
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const reducedMotion = useReducedMotion();

  const initial = reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 };
  const animate = reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 };
  const exit = reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 };

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      value={value}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value}
          initial={initial}
          animate={animate}
          exit={exit}
          transition={SPRING_DEFAULT}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
