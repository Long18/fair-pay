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

// Spring transition used for gentle hover lifts
export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
};

// Stagger delay between list items in seconds
export const STAGGER_DELAY = 0.05;

// Ripple animation duration in seconds
export const RIPPLE_DURATION = 0.6;
