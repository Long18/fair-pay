import { useCallback } from "react";
import { useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";

export function useChatEntityNavigation() {
  const go = useGo();
  const { tap } = useHaptics();

  const navigate = useCallback(
    (to: string) => {
      tap();
      go({ to });
    },
    [go, tap],
  );

  return {
    openProfile: useCallback(
      (userId: string) => {
        if (!userId) return;
        navigate(`/profile/${userId}`);
      },
      [navigate],
    ),
    openGroup: useCallback(
      (groupId: string) => {
        if (!groupId) return;
        navigate(`/groups/show/${groupId}`);
      },
      [navigate],
    ),
    openExpense: useCallback(
      (expenseId: string) => {
        if (!expenseId) return;
        navigate(`/expenses/show/${expenseId}`);
      },
      [navigate],
    ),
    openDashboard: useCallback(() => navigate("/"), [navigate]),
    openConnections: useCallback(() => navigate("/connections"), [navigate]),
    openGroupsList: useCallback(() => navigate("/groups"), [navigate]),
  };
}
