import { useLocation, Outlet } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ROUTE_TRANSITION,
  shellEnterInitial,
  shellEnterTransition,
  useReducedMotion,
  useMotionRouteLoading,
} from "@/lib/motion";

/**
 * Animated page transition wrapper around react-router's <Outlet />.
 * MindMarket in-nav: header HUD while loading, then page slides up from below (no full-screen veil).
 */
export function AnimatedOutlet() {
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const { routeLoading } = useMotionRouteLoading();
  const transition = reducedMotion
    ? shellEnterTransition(true)
    : {
        duration: ROUTE_TRANSITION.duration,
        ease: ROUTE_TRANSITION.ease,
      };
  const shellInitial = shellEnterInitial(reducedMotion);
  const routeEnter = {
    opacity: 0,
    y: ROUTE_TRANSITION.enterY,
    scale: ROUTE_TRANSITION.enterScale,
  };
  const routeLand = { opacity: 1, y: 0, scale: 1 };

  const enterTarget =
    reducedMotion || shellInitial === false
      ? routeLand
      : routeLoading
        ? routeEnter
        : routeLand;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={
          shellInitial === false
            ? false
            : reducedMotion
              ? { opacity: shellInitial.opacity, y: shellInitial.y }
              : routeEnter
        }
        animate={enterTarget}
        exit={
          reducedMotion
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={transition}
        style={{ width: "100%" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
