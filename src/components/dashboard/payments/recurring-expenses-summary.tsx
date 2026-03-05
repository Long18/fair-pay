import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecurringExpenses } from "@/modules/expenses/hooks/use-recurring-expenses";
import { RepeatIcon, ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";

export function RecurringExpensesSummary() {
  const { t, i18n } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const { active, isLoading } = useRecurringExpenses({});
  const dateLocale = i18n.language === "vi" ? vi : enUS;

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    return active.reduce((sum, r) => {
      const amount = r.template_expense?.amount || r.expenses?.amount || 0;
      let monthlyAmount = amount;

      switch (r.frequency) {
        case "weekly":
          monthlyAmount = amount * 4.33;
          break;
        case "bi_weekly":
          monthlyAmount = amount * 2.165;
          break;
        case "monthly":
          monthlyAmount = amount;
          break;
        case "quarterly":
          monthlyAmount = amount / 3;
          break;
        case "yearly":
          monthlyAmount = amount / 12;
          break;
      }

      return sum + monthlyAmount / (r.interval || 1);
    }, 0);
  }, [active]);

  // Get upcoming expenses (next 7 days)
  const upcomingExpenses = useMemo(() => {
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return active
      .filter((r) => {
        const nextDate = new Date(r.next_occurrence);
        return nextDate >= today && nextDate <= sevenDaysLater;
      })
      .slice(0, 3); // Show max 3
  }, [active]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show widget if no recurring expenses
  if (active.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <RepeatIcon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">
              {t("recurring.summary.title", "Recurring Expenses")}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { tap(); go({ to: "/recurring-expenses" }); }}
          >
            {t("common.viewAll", "View All")}
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Monthly Cost */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {t("recurring.summary.monthlyTotal", "Monthly Total")}
          </span>
          <span className="text-lg font-semibold">
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(monthlyTotal)}
          </span>
        </div>

        {/* Upcoming Expenses */}
        {upcomingExpenses.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {t("recurring.summary.upcoming", "Upcoming This Week")}
              <Badge variant="secondary" className="ml-auto">
                {upcomingExpenses.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {upcomingExpenses.map((expense) => {
                const template = expense.template_expense || expense.expenses;
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                  >
                    <div className="flex-1 truncate">
                      <p className="font-medium truncate">
                        {template?.description || t("common.unnamed", "Unnamed")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(expense.next_occurrence), "PPP", {
                          locale: dateLocale,
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-medium ml-2 whitespace-nowrap">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: template?.currency || "VND",
                      }).format(template?.amount || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
