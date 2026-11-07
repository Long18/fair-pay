import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register ScrollTrigger once for all `@/lib/motion` GSAP consumers. */
export function ensureScrollTrigger(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}
