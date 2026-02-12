import { useLocation, Outlet } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Animated page transition wrapper around react-router's <Outlet />.
 * Uses framer-motion AnimatePresence with a subtle fade + slide morph.
 */
export function AnimatedOutlet() {
  const { pathname } = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
