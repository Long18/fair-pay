import { useCallback } from "react";
import { useUpdate, useDelete } from "@refinedev/core";
import { RecurringExpense } from "../types/recurring";
import { calculateNextOccurrence } from "../types/recurring";

export function useRecurringActions() {
  const { mutate: updateRecurring } = useUpdate();
  const { mutate: deleteRecurring } = useDelete();

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
            console.log("Recurring expense paused successfully");
          },
          onError: (error) => {
            console.error("Failed to pause recurring expense:", error);
          },
        }
      );
    },
    [updateRecurring]
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
            console.log("Recurring expense resumed successfully");
          },
          onError: (error) => {
            console.error("Failed to resume recurring expense:", error);
          },
        }
      );
    },
    [updateRecurring]
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
            console.log("Skipped next occurrence successfully");
          },
          onError: (error) => {
            console.error("Failed to skip next occurrence:", error);
          },
        }
      );
    },
    [updateRecurring]
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
            console.log("Recurring expense deleted successfully");
          },
          onError: (error) => {
            console.error("Failed to delete recurring expense:", error);
          },
        }
      );
    },
    [deleteRecurring]
  );

  return {
    pause,
    resume,
    skip,
    remove,
  };
}
