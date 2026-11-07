import { useEffect, useState } from "react";

/** Minimum time so the logo motion reads; ceiling so we never block forever. */
export const FIRST_PAINT_CURTAIN_MIN_MS = 720;
export const FIRST_PAINT_CURTAIN_MAX_MS = 2800;

/**
 * Keep the brand curtain up until the document has finished loading
 * (scripts below can hydrate) and the minimum logo beat has passed.
 */
export function useFirstPaintCurtainReady(enabled: boolean): boolean {
  const [readyToDismiss, setReadyToDismiss] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const started = performance.now();
    let documentLoaded = document.readyState === "complete";
    let cancelled = false;

    const tryDismiss = () => {
      if (cancelled || !documentLoaded) return;
      const elapsed = performance.now() - started;
      const remaining = Math.max(0, FIRST_PAINT_CURTAIN_MIN_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) setReadyToDismiss(true);
      }, remaining);
    };

    const onLoad = () => {
      documentLoaded = true;
      tryDismiss();
    };

    if (documentLoaded) {
      tryDismiss();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    const maxTimer = window.setTimeout(() => {
      if (!cancelled) setReadyToDismiss(true);
    }, FIRST_PAINT_CURTAIN_MAX_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      window.clearTimeout(maxTimer);
    };
  }, [enabled]);

  return readyToDismiss;
}
