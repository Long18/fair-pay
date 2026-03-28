import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface AnimatedRowProps extends HTMLMotionProps<"div"> {
  index?: number;
}

const AnimatedRow = forwardRef<HTMLDivElement, AnimatedRowProps>(
  ({ index, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        custom={index}
        {...props}
      />
    );
  }
);

AnimatedRow.displayName = "AnimatedRow";

export { AnimatedRow };
