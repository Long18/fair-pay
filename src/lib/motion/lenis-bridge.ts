import type Lenis from "lenis";

let lenisRef: Lenis | null = null;

export function setMotionLenis(instance: Lenis | null) {
  lenisRef = instance;
}

export function scrollMotionToTop(options?: { immediate?: boolean }) {
  if (lenisRef) {
    lenisRef.scrollTo(0, {
      immediate: options?.immediate ?? false,
      duration: options?.immediate ? 0 : 0.9,
    });
    return;
  }
  window.scrollTo({
    top: 0,
    behavior: options?.immediate ? "auto" : "smooth",
  });
}
