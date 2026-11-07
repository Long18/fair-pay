import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { ENTRANCE_Y, SPRING_GENTLE, STAGGER_DELAY } from "@/lib/animation";
import { STAGGER_MAX_CLIENT } from "@/lib/motion";

type HTMLTag = keyof React.JSX.IntrinsicElements extends infer K
  ? K extends keyof HTMLElementTagNameMap
    ? K
    : never
  : never;

interface AnimatedListProps {
  items: unknown[];
  as?: HTMLTag;
  className?: string;
  children: React.ReactNode;
}

function AnimatedList({
  items: _items,
  as: Tag = "div",
  className,
  children,
}: AnimatedListProps) {
  const reducedMotion = useReducedMotion();
  const childArray = React.Children.toArray(children);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag className={className} {...({} as any)}>
      <AnimatePresence mode="popLayout">
        {childArray.map((child, index) => {
          const key =
            React.isValidElement(child) && child.key != null
              ? child.key
              : index;
          const skipStagger = reducedMotion || index >= STAGGER_MAX_CLIENT;
          const staggerIndex = Math.min(index, STAGGER_MAX_CLIENT - 1);
          return (
            <motion.div
              key={key}
              initial={skipStagger ? false : { opacity: 0, y: ENTRANCE_Y }}
              animate={{ opacity: 1, y: 0 }}
              exit={skipStagger ? {} : { opacity: 0, y: ENTRANCE_Y }}
              transition={
                skipStagger
                  ? { duration: 0 }
                  : { ...SPRING_GENTLE, delay: staggerIndex * STAGGER_DELAY }
              }
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </Tag>
  );
}

export { AnimatedList };
