/**
 * Performance optimization utilities
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * 
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastRan: number | null = null;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    
    if (lastRan === null) {
      // First call - execute immediately
      func(...args);
      lastRan = now;
    } else {
      const timeSinceLastRan = now - lastRan;
      
      if (timeSinceLastRan >= wait) {
        // Enough time has passed - execute immediately
        func(...args);
        lastRan = now;
      } else {
        // Not enough time - schedule for later
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          func(...args);
          lastRan = Date.now();
          timeoutId = null;
        }, wait - timeSinceLastRan);
      }
    }
  };
}
