/**
 * Animation Utilities for FairPay
 * 
 * Centralized animation configurations using framer-motion
 * for consistent animations across the application.
 * 
 * Design Guidelines:
 * - Expand/collapse: 300ms duration
 * - Fade transitions: 200ms duration
 * - Micro-interactions: 150ms duration
 * - Use ease-out for entering, ease-in for exiting
 */

import { Variants } from "framer-motion";

/**
 * Standard animation durations (in seconds)
 */
export const ANIMATION_DURATION = {
  fast: 0.15,      // 150ms - Micro-interactions
  normal: 0.2,     // 200ms - Standard transitions
  slow: 0.3,       // 300ms - Expand/collapse
  toast: 0.2,      // 200ms - Toast notifications
} as const;

/**
 * Standard easing functions
 */
export const ANIMATION_EASING = {
  easeOut: [0.0, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],
  spring: { type: "spring", stiffness: 300, damping: 30 },
} as const;

/**
 * Expand/Collapse Animation (300ms)
 * Used for: Activity rows, split cards, accordions
 */
export const expandCollapseVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.slow,
      ease: ANIMATION_EASING.easeIn,
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.slow,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

/**
 * Fade Animation (200ms)
 * Used for: Overlays, modals, tooltips
 */
export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeIn,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

/**
 * Slide Animation
 * Used for: Drawers, sheets, side panels
 */
export const slideVariants = {
  fromLeft: {
    hidden: { x: "-100%", opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeOut,
      },
    },
    exit: {
      x: "-100%",
      opacity: 0,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeIn,
      },
    },
  },
  fromRight: {
    hidden: { x: "100%", opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeOut,
      },
    },
    exit: {
      x: "100%",
      opacity: 0,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeIn,
      },
    },
  },
  fromTop: {
    hidden: { y: "-100%", opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeOut,
      },
    },
    exit: {
      y: "-100%",
      opacity: 0,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeIn,
      },
    },
  },
  fromBottom: {
    hidden: { y: "100%", opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeOut,
      },
    },
    exit: {
      y: "100%",
      opacity: 0,
      transition: {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASING.easeIn,
      },
    },
  },
} as const;

/**
 * Scale Animation
 * Used for: Buttons, cards, interactive elements
 */
export const scaleVariants: Variants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASING.easeIn,
    },
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

/**
 * Stagger Children Animation
 * Used for: Lists, grids
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

/**
 * Tab Transition Animation
 * Used for: Tab content switching
 */
export const tabContentVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeOut,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeIn,
    },
  }),
};

/**
 * Toast Notification Animation
 * Used for: Toast notifications (Sonner already handles this, but provided for reference)
 */
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATION.toast,
      ease: ANIMATION_EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: ANIMATION_DURATION.toast,
      ease: ANIMATION_EASING.easeIn,
    },
  },
};

/**
 * Rotation Animation
 * Used for: Chevrons, arrows, loading indicators
 */
export const rotateVariants: Variants = {
  collapsed: {
    rotate: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeInOut,
    },
  },
  expanded: {
    rotate: 180,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeInOut,
    },
  },
};

/**
 * Hover Animation Presets
 */
export const hoverScale = {
  scale: 1.05,
  transition: {
    duration: ANIMATION_DURATION.fast,
    ease: ANIMATION_EASING.easeOut,
  },
};

export const hoverLift = {
  y: -2,
  transition: {
    duration: ANIMATION_DURATION.fast,
    ease: ANIMATION_EASING.easeOut,
  },
};

/**
 * Tap Animation Presets
 */
export const tapScale = {
  scale: 0.95,
  transition: {
    duration: ANIMATION_DURATION.fast,
    ease: ANIMATION_EASING.easeIn,
  },
};
