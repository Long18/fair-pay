import { useCallback } from "react";
import { useNotification } from "@refinedev/core";
import { useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import { useTranslation } from "react-i18next";
import { RecurringExpense } from "../types/recurring";
import { calculateNextOccurrence } from "../types/recurring";

export function useRecurringActions() {
  const { mutate: updateRecurring } = useInstantUpdate();
  const { mutate: deleteRecurring } = useInstantDelete();
  const { open: notify } = useNotification();
  const { t } = useTranslation();

  const pause = useCallback(
    (id: string) => {
      updateRecurring(
        {
          resource: "recurring_expenses",
          id,
          values: { is_active: false },
        },
        {
          onSuccess: () => {
            notify?.({
              type: "success",
              message: t("recurring.pausedSuccess", "Recurring expense paused"),
              description: t("recurring.pausedDescription", "Future expenses will not be created"),
            });
          },
          onError: (error) => {
            notify?.({
              type: "error",
              message: t("recurring.pausedError", "Failed to pause"),
              description: error instanceof Error ? error.message : undefined,
            });
          },
        }
      );
    },
    [updateRecurring, notify, t]
  );

  const resume = useCallback(
    (id: string) => {
      updateRecurring(
        {
          resource: "recurring_expenses",
          id,
          values: { is_active: true },
        },
        {
          onSuccess: () => {
            notify?.({
              type: "success",
              message: t("recurring.resumedSuccess", "Recurring expense resumed"),
              description: t("recurring.resumedDescription", "Future expenses will be created automatically"),
            });
          },
          onError: (error) => {
            notify?.({
              type: "error",
              message: t("recurring.resumedError", "Failed to resume"),
              description: error instanceof Error ? error.message : undefined,
            });
          },
        }
      );
    },
    [updateRecurring, notify, t]
  );

  const skip = useCallback(
    (expense: RecurringExpense) => {
      const nextOccurrence = calculateNextOccurrence(
        new Date(expense.next_occurrence),
        expense.frequency,
        expense.interval
      );

      updateRecurring(
        {
          resource: "recurring_expenses",
          id: expense.id,
          values: { next_occurrence: nextOccurrence.toISOString() },
        },
        {
          onSuccess: () => {
            notify?.({
              type: "success",
              message: t("recurring.skippedSuccess", "Next occurrence skipped"),
              description: t("recurring.skippedDescription", "The next scheduled expense has been skipped"),
            });
          },
          onError: (error) => {
            notify?.({
              type: "error",
              message: t("recurring.skippedError", "Failed to skip"),
              description: error instanceof Error ? error.message : undefined,
            });
          },
        }
      );
    },
    [updateRecurring, notify, t]
  );

  const remove = useCallback(
    (id: string) => {
      deleteRecurring(
        {
          resource: "recurring_expenses",
          id,
        },
        {
          onSuccess: () => {
            notify?.({
              type: "success",
              message: t("recurring.deletedSuccess", "Recurring expense deleted"),
              description: t("recurring.deletedDescription", "Future expenses will not be created"),
            });
          },
          onError: (error) => {
            notify?.({
              type: "error",
              message: t("recurring.deletedError", "Failed to delete"),
              description: error instanceof Error ? error.message : undefined,
            });
          },
        }
      );
    },
    [deleteRecurring, notify, t]
  );

  return {
    pause,
    resume,
    skip,
    remove,
  };
}
