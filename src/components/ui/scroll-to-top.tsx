import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUpIcon } from "lucide-react";
import { FloatingPill } from "@/components/ui/floating-stack";
import { useFullBleedStageOccludesFloating } from "@/hooks/ui/use-full-bleed-stage-occludes-floating";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import {
  FAB_LEFT_STACK,
  FLOATING_SPRING,
  SCROLL_TO_TOP_THRESHOLD_PX,
  Z_FLOATING,
  getBottomOffsetClasses,
  getSideOffsetClasses,
} from "@/lib/floating-tokens";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const { tap } = useHaptics();
  const reducedMotion = useReducedMotion();
  const pondOccludesFab = useFullBleedStageOccludesFloating({
    side: "left",
    stackIndex: FAB_LEFT_STACK.scrollToTop,
  });

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_TO_TOP_THRESHOLD_PX);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    tap();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tap]);

  const show = visible && !pondOccludesFab;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="scroll-to-top"
          className={cn(
            "fixed flex flex-col items-start",
            getBottomOffsetClasses(FAB_LEFT_STACK.scrollToTop),
            getSideOffsetClasses("left"),
          )}
          style={{ zIndex: Z_FLOATING.pill }}
          initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reducedMotion ? undefined : { scale: 0.85, opacity: 0 }}
          transition={reducedMotion ? undefined : FLOATING_SPRING}
        >
          <FloatingPill
            size="sm"
            icon={<ChevronUpIcon className="h-4 w-4" />}
            ariaLabel="Scroll to top"
            onClick={scrollToTop}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
