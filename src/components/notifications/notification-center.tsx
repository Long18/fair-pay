import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRecurringExpenses } from "@/modules/expenses/hooks/use-recurring-expenses";
import { RepeatIcon, BellIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const { t, i18n } = useTranslation();
  const go = useGo();
  const { active } = useRecurringExpenses({});
  const dateLocale = i18n.language === "vi" ? vi : enUS;

  // Get upcoming expenses (next 7 days)
  const upcomingExpenses = useMemo(() => {
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return active.filter((r) => {
      const nextDate = new Date(r.next_occurrence);
      return nextDate >= today && nextDate <= sevenDaysLater;
    });
  }, [active]);

  // Get overdue expenses
  const overdueExpenses = useMemo(() => {
    const today = new Date();
    return active.filter((r) => {
      const nextDate = new Date(r.next_occurrence);
      return nextDate < today;
    });
  }, [active]);

  const handleNotificationClick = () => {
    go({ to: "/recurring-expenses" });
    onOpenChange(false);
  };

  const hasNotifications = upcomingExpenses.length > 0 || overdueExpenses.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            {t("notifications.title", "Notifications")}
          </SheetTitle>
          <SheetDescription>
            {t("notifications.description", "Upcoming and overdue recurring expenses")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {!hasNotifications ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2Icon className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-sm font-medium">
                {t("notifications.empty", "All caught up!")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("notifications.emptyDescription", "No upcoming or overdue expenses")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overdue Expenses */}
              {overdueExpenses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-destructive">
                      {t("notifications.overdue", "Overdue")}
                    </h3>
                    <Badge variant="destructive" className="text-xs">
                      {overdueExpenses.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {overdueExpenses.map((expense) => {
                      const template = expense.template_expense || expense.expenses;
                      return (
                        <div
                          key={expense.id}
                          className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                          onClick={handleNotificationClick}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-destructive/10">
                              <RepeatIcon className="h-4 w-4 text-destructive" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {template?.description || t("common.unnamed", "Unnamed")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t("notifications.was", "Was due")} {format(new Date(expense.next_occurrence), "PPP", { locale: dateLocale })}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-destructive whitespace-nowrap">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: template?.currency || "VND",
                              }).format(template?.amount || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Expenses */}
              {upcomingExpenses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {t("notifications.upcoming", "Upcoming This Week")}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {upcomingExpenses.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {upcomingExpenses.map((expense) => {
                      const template = expense.template_expense || expense.expenses;
                      return (
                        <div
                          key={expense.id}
                          className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                          onClick={handleNotificationClick}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <RepeatIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {template?.description || t("common.unnamed", "Unnamed")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(expense.next_occurrence), "PPP", { locale: dateLocale })}
                              </p>
                            </div>
                            <span className="text-sm font-medium whitespace-nowrap">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: template?.currency || "VND",
                              }).format(template?.amount || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {hasNotifications && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
            <Button
              className="w-full"
              onClick={() => {
                go({ to: "/recurring-expenses" });
                onOpenChange(false);
              }}
            >
              {t("notifications.viewAll", "View All Recurring Expenses")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
