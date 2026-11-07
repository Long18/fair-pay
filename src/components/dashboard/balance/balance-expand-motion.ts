/** Shared expand/collapse timing for balance rows (panel height + chevron). */
export const BALANCE_EXPAND_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.88,
};

export const BALANCE_EXPAND_MOTION_TRANSITION = {
  height: BALANCE_EXPAND_SPRING,
  opacity: {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1] as const,
  },
};
