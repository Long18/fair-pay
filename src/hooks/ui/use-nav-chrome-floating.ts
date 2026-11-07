export type NavChromeMode = "docked" | "floating";

/**
 * Route HUD: snap to floating pill **first**, then page content loads beneath.
 * Scroll: same pill chrome while scrolled.
 */
export function useNavChromeFloating(
  scrolled: boolean,
  routeLoading: boolean,
  reducedMotion: boolean,
): NavChromeMode {
  if (reducedMotion) {
    return scrolled || routeLoading ? "floating" : "docked";
  }
  if (routeLoading) return "floating";
  return scrolled ? "floating" : "docked";
}
