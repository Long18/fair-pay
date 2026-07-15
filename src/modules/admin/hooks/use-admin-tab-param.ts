import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * Sync an admin section tab with `?tab=` in the URL.
 * Invalid values fall back to `defaultTab`.
 */
export function useAdminTabParam(
  defaultTab: string,
  validTabs: readonly string[]
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab =
    requested && validTabs.includes(requested) ? requested : defaultTab;

  const setActiveTab = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return [activeTab, setActiveTab] as const;
}
