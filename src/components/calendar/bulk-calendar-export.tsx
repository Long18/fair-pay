import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CalendarIcon, DownloadIcon } from "@/components/ui/icons";
import { RecurringExpense } from "@/modules/expenses/types/recurring";
import { exportAllRecurringExpensesToCalendar } from "@/lib/calendar-export";
import { useNotification } from "@refinedev/core";

interface BulkCalendarExportProps {
  expenses: RecurringExpense[];
  disabled?: boolean;
}

export function BulkCalendarExport({ expenses, disabled }: BulkCalendarExportProps) {
  const { t } = useTranslation();
  const { open: notify } = useNotification();

  const handleExportAll = () => {
    if (expenses.length === 0) {
      notify?.({
        type: "error",
        message: t("calendar.noExpenses", "No expenses to export"),
        description: t("calendar.noExpensesDescription", "Create some recurring expenses first"),
      });
      return;
    }

    try {
      exportAllRecurringExpensesToCalendar(expenses);

      notify?.({
        type: "success",
        message: t("calendar.exportedAll", "All expenses exported"),
        description: t(
          "calendar.exportedAllDescription",
          `${expenses.filter(e => e.is_active).length} active recurring expenses exported to calendar file`
        ),
      });
    } catch (error) {
      notify?.({
        type: "error",
        message: t("calendar.exportError", "Export failed"),
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const activeCount = expenses.filter(e => e.is_active).length;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportAll}
      disabled={disabled || expenses.length === 0}
    >
      <CalendarIcon className="h-4 w-4 mr-2" />
      {t("calendar.exportAll", "Export All to Calendar")}
      {activeCount > 0 && ` (${activeCount})`}
    </Button>
  );
}
