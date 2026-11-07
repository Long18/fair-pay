import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";

export interface BreakdownExpenseRowProps {
  id: string;
  splitId: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  groupName?: string | null;
  category?: string | null;
  myShare: number;
  direction: "i_owe" | "they_owe";
  paidByName: string;
  status: "paid" | "unpaid" | "partial";
  isSettled: boolean;
  settledAt?: string | null;
  isSelected: boolean;
  onSelectChange: (splitId: string, checked: boolean) => void;
  onInlineSettle?: (splitId: string) => void;
  canSettle?: boolean;
}

function formatSignedCurrency(amount: number, currency: string) {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

export function BreakdownExpenseRow({
  id,
  splitId,
  description,
  currency,
  expenseDate,
  groupName,
  category,
  myShare,
  direction,
  paidByName,
  isSettled,
  settledAt,
  isSelected,
  onSelectChange,
}: BreakdownExpenseRowProps) {
  const { t, i18n } = useTranslation();

  const expenseUrl = `/expenses/show/${id}`;
  const signedAmount = direction === "i_owe" ? -myShare : myShare;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
      }),
    [i18n.language]
  );

  const formatDate = (value: string) => {
    try {
      return dateFormatter.format(new Date(value));
    } catch {
      return value;
    }
  };

  const contextParts = [
    formatDate(expenseDate),
    t("debts.paidByContext", "{{name}} paid", { name: paidByName }),
  ];

  if (isSettled && settledAt) {
    contextParts.push(
      t("debts.settledOn", "Settled {{date}}", { date: formatDate(settledAt) })
    );
  } else if (groupName) {
    contextParts.push(groupName);
  } else if (category) {
    contextParts.push(category);
  }

  const rowBody = (
    <Link
      to={expenseUrl}
      className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
    >
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-medium text-foreground",
            isSettled && "text-muted-foreground"
          )}
        >
          {description}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {contextParts.join(" · ")}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <p
          className={cn(
            "break-all text-sm font-semibold tabular-nums sm:break-normal",
            direction === "i_owe"
              ? "text-semantic-negative"
              : "text-semantic-positive",
            isSettled && "text-muted-foreground"
          )}
        >
          {formatSignedCurrency(signedAmount, currency)}
        </p>
      </div>
    </Link>
  );

  if (isSettled) {
    return (
      <div className="flex min-h-11 w-full items-start gap-3 px-3 py-2.5 sm:px-4">
        <div className="size-5 shrink-0" aria-hidden />
        {rowBody}
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors sm:px-4",
        isSelected && "bg-primary/5",
        !isSelected && "hover:bg-muted/35"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => {
          if (checked !== "indeterminate") {
            onSelectChange(splitId, checked);
          }
        }}
        className="mt-2 size-5 shrink-0 rounded-md"
        aria-label={t("debts.selectExpense", "Select {{description}}", {
          description,
        })}
      />
      {rowBody}
    </label>
  );
}
