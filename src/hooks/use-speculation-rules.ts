import { useMemo } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useLocation } from "react-router";
import { useAdminAccess } from "../modules/admin/hooks/use-admin-access";

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
  const { isStaff, canViewPeople, canViewTransactions } = useAdminAccess();

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

      // Staff routes — capability-filtered so moderators only prefetch what they can open.
      if (isStaff) {
        rules.prefetch.push({
          urls: [
            "/admin",
            ...(canViewPeople ? ["/admin/people"] : []),
            ...(canViewTransactions ? ["/admin/transactions"] : []),
          ],
          eagerness: "moderate",
        });
      }
    }

    return JSON.stringify(rules);
  }, [pathname, identity, isStaff, canViewPeople, canViewTransactions]);
}
