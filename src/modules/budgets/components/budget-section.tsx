import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/modules/expenses/lib/categories";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { useBudgets } from "../hooks/use-budgets";
import { computeBudgetVsActual, currentYearMonth } from "../budget-vs-actual";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";

interface BudgetSectionProps {
  actuals: Array<{ category: string; amount: number }>;
}

export function BudgetSection({ actuals }: BudgetSectionProps) {
  const { t } = useTranslation();
  const yearMonth = currentYearMonth();
  const { budgets, isLoading, upsertBudget, deleteBudget } = useBudgets(yearMonth);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0] ?? "Other");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () =>
      computeBudgetVsActual(
        budgets.map((b) => ({ category: b.category, amount: b.amount })),
        actuals,
      ),
    [budgets, actuals],
  );

  const handleSave = async () => {
    const parsed = Number(amount.replace(/,/g, ""));
    if (!category || !Number.isFinite(parsed) || parsed < 0) {
      toast.error(t("budgets.invalidAmount", "Enter a valid budget amount"));
      return;
    }
    setSaving(true);
    try {
      await upsertBudget(category, parsed);
      setAmount("");
      toast.success(t("budgets.saved", "Budget saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("budgets.saveError", "Failed to save budget"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("budgets.title", "Monthly budgets")}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{yearMonth}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">{t("budgets.category", "Category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">{t("budgets.amount", "Amount (VND)")}</Label>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              className="h-9"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000"
            />
          </div>
          <Button size="sm" className="h-9 gap-1.5" onClick={handleSave} disabled={saving || isLoading}>
            <PlusIcon className="h-4 w-4" />
            {t("budgets.set", "Set")}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">{t("common.loading", "Loading…")}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("budgets.empty", "Set a monthly budget per category to track spending.")}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const budget = budgets.find((b) => b.category === row.category);
              const barValue = Math.min(100, row.percentUsed);
              return (
                <li key={row.category} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{row.category}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          row.overBudget ? "text-semantic-negative" : "text-muted-foreground",
                        )}
                      >
                        {formatNumber(row.actualAmount)} / {formatNumber(row.budgetAmount)} ₫
                      </span>
                      {budget && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={t("budgets.delete", "Remove budget")}
                          onClick={async () => {
                            try {
                              await deleteBudget(budget.id);
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : t("budgets.deleteError", "Failed to remove"),
                              );
                            }
                          }}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={barValue}
                    className={cn(row.overBudget && "[&_[data-slot=progress-indicator]]:bg-destructive")}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
