import type { CSSProperties } from "react";

/**
 * Bencho blocks read these custom properties; map them to FairPay tokens
 * on each component root so nothing leaks into global scope.
 */
export const benchoTokenStyle = {
  "--bg": "hsl(var(--background))",
  "--board": "hsl(var(--background))",
  "--card": "hsl(var(--card))",
  "--fill-on": "hsl(var(--foreground))",
  "--fill-slab": "hsl(var(--card))",
  "--fill-on-rgb": "var(--foreground-rgb, 10 10 10)",
  "--ink-rgb": "var(--foreground-rgb, 10 10 10)",
  "--font-ui": "var(--font-sans)",
  "--ink": "hsl(var(--foreground))",
  "--pane-edge": "hsl(var(--border))",
} as CSSProperties;
