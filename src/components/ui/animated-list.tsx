import * as React from "react";
import { motion } from "framer-motion";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import type { StaggerAnimationOptions } from "@/hooks/ui/use-stagger-animation";

interface AnimatedListProps extends React.HTMLAttributes<HTMLElement> {
  items: unknown[];
  options?: StaggerAnimationOptions;
  as?: keyof React.JSX.IntrinsicElements;
  children: React.ReactNode;
}

function AnimatedList({
  items,
  options,
  as = "div",
  className,
  children,
  ...rest
}: AnimatedListProps) {
  const { containerVariants, animationKey } = useStaggerAnimation(items, options);

  const MotionComponent = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionComponent
      key={animationKey}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      {...(rest as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </MotionComponent>
  );
}

export { AnimatedList };
