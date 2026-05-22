import { type Transition } from "framer-motion";

// Scale constants
export const HOVER_SCALE = 1.03;
export const TAP_SCALE = 0.97;

// Entrance Y offset in pixels
export const ENTRANCE_Y = 8;

// Spring transition used for button press/hover
export const SPRING_DEFAULT: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

// Spring transition used for tooltips (snappy, short)
export const SPRING_TOOLTIP: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.6,
};

// Spring transition used for gentle hover lifts
export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
};

// Ease transition used for generic animations
export const EASE_DEFAULT: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
};

// Spring transition used for overlay components (dialog, sheet, drawer)
export const SPRING_OVERLAY: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

// Stagger delay between list items in seconds
export const STAGGER_DELAY = 0.05;

// Ripple animation duration in seconds
export const RIPPLE_DURATION = 0.6;
