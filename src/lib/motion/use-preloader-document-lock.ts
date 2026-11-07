import { useEffect } from "react";

const ATTR = "data-fp-preloader";

/** While active, main app content stays hidden (MindMarket: narrative under fixed preloader). */
export function usePreloaderDocumentLock(active: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (active) {
      root.setAttribute(ATTR, "active");
    } else {
      root.removeAttribute(ATTR);
    }
    return () => {
      root.removeAttribute(ATTR);
    };
  }, [active]);
}
