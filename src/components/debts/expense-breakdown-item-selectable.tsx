import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";

interface ExpenseBreakdownItemSelectableProps {
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

export function ExpenseBreakdownItemSelectable({
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
}: ExpenseBreakdownItemSelectableProps) {
  const { t, i18n } = useTranslation();

  const expenseUrl = `/expenses/show/${id}`;
  const signedAmount = direction === "i_owe" ? -myShare : myShare;

  const formatDate = (value: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
      }).format(new Date(value));
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

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-2 py-4 transition-colors",
        isSelected && "bg-primary/5",
        !isSelected && !isSettled && "hover:bg-muted/35"
      )}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5">
        {!isSettled ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              if (checked !== "indeterminate") {
                onSelectChange(splitId, checked);
              }
            }}
            className="size-5 rounded-md"
            aria-label={t("debts.selectExpense", "Select {{description}}", {
              description,
            })}
          />
        ) : null}
      </div>

      <Link
        to={expenseUrl}
        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
      >
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-semibold text-foreground",
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
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              isSettled
                ? "text-muted-foreground"
                : direction === "i_owe"
                  ? "text-semantic-negative"
                  : "text-semantic-positive"
            )}
          >
            {formatSignedCurrency(signedAmount, currency)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {direction === "i_owe"
              ? t("debts.youOweLabel", "You owe")
              : t("debts.theyOweLabel", "Owes you")}
          </span>
        </div>
      </Link>
    </div>
  );
}
