import { useEffect, useState } from "react";

/**
 * Detects whether the application is in dark mode by observing the
 * `dark` class on `document.documentElement`.
 *
 * Uses a MutationObserver to react to class changes in real time,
 * so the returned value stays in sync when the user toggles themes.
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );

  useEffect(() => {
    const root = document.documentElement;

    // Sync initial state in case it changed between render and effect
    setIsDark(root.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
