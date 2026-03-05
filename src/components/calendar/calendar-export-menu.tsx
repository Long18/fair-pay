import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CalendarIcon, DownloadIcon, ArrowUpRightIcon } from "@/components/ui/icons";
import { RecurringExpense } from "@/modules/expenses/types/recurring";
import {
  exportRecurringExpenseToCalendar,
  addToGoogleCalendar,
  openInCalendarApp,
} from "@/lib/calendar-export";
import { useNotification } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";

interface CalendarExportMenuProps {
  expense: RecurringExpense;
  variant?: "button" | "icon";
}

export function CalendarExportMenu({ expense, variant = "button" }: CalendarExportMenuProps) {
  const { t } = useTranslation();
  const { open: notify } = useNotification();
  const { tap } = useHaptics();

  const handleExportICS = () => {
    tap();
    try {
      exportRecurringExpenseToCalendar(expense);
      notify?.({
        type: "success",
        message: t("calendar.exported", "Calendar file downloaded"),
        description: t(
          "calendar.exportedDescription",
          "Import the .ics file into your calendar app"
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

  const handleGoogleCalendar = () => {
    tap();
    try {
      addToGoogleCalendar(expense);
      notify?.({
        type: "success",
        message: t("calendar.opening", "Opening Google Calendar"),
        description: t("calendar.openingDescription", "Add the event in the new tab"),
      });
    } catch (error) {
      notify?.({
        type: "error",
        message: t("calendar.openError", "Failed to open calendar"),
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleOpenInApp = () => {
    tap();
    try {
      openInCalendarApp(expense);
      notify?.({
        type: "success",
        message: t("calendar.opening", "Opening calendar app"),
        description: t("calendar.openingAppDescription", "Add the event in your calendar app"),
      });
    } catch (error) {
      notify?.({
        type: "error",
        message: t("calendar.openError", "Failed to open calendar"),
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon">
            <CalendarIcon className="h-4 w-4" />
            <span className="sr-only">{t("calendar.export", "Export to calendar")}</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {t("calendar.addToCalendar", "Add to Calendar")}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ArrowUpRightIcon className="h-4 w-4 mr-2" />
          {t("calendar.googleCalendar", "Google Calendar")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleOpenInApp}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          {t("calendar.appleCalendar", "Apple/Outlook Calendar")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleExportICS}>
          <DownloadIcon className="h-4 w-4 mr-2" />
          {t("calendar.downloadICS", "Download .ics file")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
