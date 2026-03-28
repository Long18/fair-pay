import { useMemo } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useLocation } from "react-router";
import { useIsAdmin } from "../modules/admin/hooks/use-is-admin";

interface SpeculationRule {
  urls: string[];
  eagerness: "moderate";
}

interface SpeculationRulesConfig {
  prefetch: SpeculationRule[];
}

export function useSpeculationRules(): string | null {
  const { data: identity } = useGetIdentity();
  const { pathname } = useLocation();
  const { isAdmin } = useIsAdmin();

  return useMemo(() => {
    // Check browser support
    if (!HTMLScriptElement.supports?.("speculationrules")) return null;

    // Respect Save-Data preference
    const connection = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return null;

    const rules: SpeculationRulesConfig = { prefetch: [] };

    // Base public routes (SPA navigations after initial load)
    rules.prefetch.push({
      urls: ["/login", "/register", "/about", "/privacy", "/terms", "/contact"],
      eagerness: "moderate",
    });

    if (identity) {
      // Authenticated core routes
      rules.prefetch.push({
        urls: ["/connections", "/balances", "/settings"],
        eagerness: "moderate",
      });

      // Route-contextual rules
      if (pathname === "/connections") {
        rules.prefetch.push({
          urls: ["/groups/create", "/expenses/create"],
          eagerness: "moderate",
        });
      } else if (pathname.startsWith("/groups/show/")) {
        const groupId = pathname.split("/groups/show/")[1]?.split("/")[0];
        if (groupId) {
          rules.prefetch.push({
            urls: [
              `/groups/${groupId}/expenses/create`,
              `/groups/${groupId}/payments/create`,
            ],
            eagerness: "moderate",
          });
        }
      }

      // Admin routes — uses useIsAdmin which calls is_admin() RPC
      if (isAdmin) {
        rules.prefetch.push({
          urls: ["/admin", "/admin/people", "/admin/transactions"],
          eagerness: "moderate",
        });
      }
    }

    return JSON.stringify(rules);
  }, [pathname, identity, isAdmin]);
}
