/**
 * Circular Reveal Animation Utility
 *
 * Uses the View Transitions API to create a circular reveal effect
 * when switching themes. Falls back to instant transition for
 * browsers that don't support the API.
 */

export interface CircularRevealOptions {
  x: number;
  y: number;
  duration?: number;
  easing?: string;
}

/**
 * Check if the View Transitions API is supported
 */
export function isViewTransitionsSupported(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/**
 * Execute a callback with circular reveal animation
 *
 * @param callback - Function to execute (typically theme change)
 * @param options - Animation options including click coordinates
 */
export async function withCircularReveal(
  callback: () => void,
  options: CircularRevealOptions
): Promise<void> {
  const { x, y, duration = 500, easing = 'ease-in-out' } = options;

  // Fallback for browsers without View Transitions API support
  if (!isViewTransitionsSupported()) {
    callback();
    return;
  }

  // Calculate the radius needed to cover the entire viewport from the click point
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // Start the view transition
  const transition = (document as any).startViewTransition(() => {
    callback();
  });

  // Wait for the transition to be ready, then apply the circular reveal animation
  try {
    await transition.ready;

    // Animate the ::view-transition-new(root) pseudo-element
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing,
        pseudoElement: '::view-transition-new(root)',
      }
    );

    // Wait for the entire transition to finish before resolving
    await transition.finished;
  } catch (error) {
    // If animation fails, at least the callback was executed
    console.warn('View transition animation failed:', error);
  }
}
