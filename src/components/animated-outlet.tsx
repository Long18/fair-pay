import { useLocation, Outlet } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Animated page transition wrapper around react-router's <Outlet />.
 * Uses "popLayout" mode so the new page renders immediately while
 * the old page animates out — no blank gap between transitions.
 */
export function AnimatedOutlet() {
  const { pathname } = useLocation();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ width: "100%" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
