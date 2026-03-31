import { useCallback } from "react";
import { useInstantUpdate } from "@/hooks/use-instant-mutation";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Group } from "../types";

interface UseSimplifyDebtsSettingProps {
  groupId: string;
  groupData: Group | undefined;
  isAdmin: boolean;
}

interface UseSimplifyDebtsSettingReturn {
  isSimplified: boolean;
  isUpdating: boolean;
  toggleSimplification: (enabled: boolean) => void;
  canToggle: boolean;
}

/**
 * Hook to manage the simplify_debts setting for a group.
 *
 * Reads from groupData (fetched via useOne<Group>), writes via useUpdate
 * with Refine's built-in optimistic update and automatic rollback on error.
 *
 * Only group admins and the group creator can toggle the setting.
 */
export function useSimplifyDebtsSetting({
  groupId,
  groupData,
  isAdmin,
}: UseSimplifyDebtsSettingProps): UseSimplifyDebtsSettingReturn {
  const { t } = useTranslation();
  const { mutate, mutation } = useInstantUpdate();

  const isSimplified = groupData?.simplify_debts ?? false;
  const canToggle = isAdmin || false;

  const toggleSimplification = useCallback(
    (enabled: boolean) => {
      if (!canToggle) return;

      mutate(
        {
          resource: "groups",
          id: groupId,
          values: { simplify_debts: enabled },
          mutationMode: "optimistic",
          meta: { undoConfig: { enabled: false } },
          optimisticUpdateMap: {
            detail: (previous, values) => {
              if (!previous) return null;
              return {
                ...previous,
                data: {
                  ...previous.data,
                  ...values,
                },
              };
            },
            list: true,
            many: true,
          },
          successNotification: false,
          errorNotification: false,
        },
        {
          onError: () => {
            toast.error(
              t(
                "debts.updateError",
                "Không thể cập nhật cài đặt. Vui lòng thử lại."
              )
            );
          },
        }
      );
    },
    [canToggle, mutate, groupId, t]
  );

  return {
    isSimplified,
    isUpdating: mutation.isPending,
    toggleSimplification,
    canToggle,
  };
}
