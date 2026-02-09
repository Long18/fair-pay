import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useGo } from "@refinedev/core";

interface ExpenseBreakdownItemSelectableProps {
  id: string;
  splitId: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  groupName?: string | null;
  myShare: number;
  direction: 'i_owe' | 'they_owe';
  paidByName: string;
  status: 'paid' | 'unpaid' | 'partial';
  isSettled: boolean;
  isSelected: boolean;
  onSelectChange: (splitId: string, checked: boolean) => void;
}

export function ExpenseBreakdownItemSelectable({
  id,
  splitId,
  description,
  amount,
  currency,
  expenseDate,
  groupName,
  myShare,
  direction,
  paidByName,
  status,
  isSettled,
  isSelected,
  onSelectChange,
}: ExpenseBreakdownItemSelectableProps) {
  const { t } = useTranslation();
  const go = useGo();

  const isIOwe = direction === 'i_owe';

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (checked !== 'indeterminate') {
      onSelectChange(splitId, checked);
    }
  };

  const handleRowClick = () => {
    go({ to: `/expenses/show/${id}` });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 pr-4 rounded-lg transition-colors border relative",
        // Left color accent for direction
        isIOwe
          ? "pl-4 border-l-[3px] border-l-red-400 dark:border-l-red-500"
          : "pl-4 border-l-[3px] border-l-green-400 dark:border-l-green-500",
        isSelected && "border-primary bg-primary/5 !border-l-primary",
        !isSelected && "border-transparent hover:bg-muted/50",
        isSettled && "opacity-60"
      )}
    >
      {/* Checkbox */}
      {!isSettled && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Expense Info */}
      <div
        onClick={handleRowClick}
        className="flex-1 min-w-0 cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-1">
          <p className={cn("typography-row-title truncate", isSettled && "line-through")}>
            {description}
          </p>
          <PaymentStateBadge state={status} size="sm" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Paid by indicator */}
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            isIOwe
              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
          )}>
            {paidByName} {t('debts.paid', 'paid')}
          </span>
          <span className="typography-metadata">•</span>
          <span className="typography-metadata">
            {formatDate(expenseDate)}
          </span>
          {groupName && (
            <>
              <span className="typography-metadata">•</span>
              <Badge variant="outline" className="typography-metadata">
                {groupName}
              </Badge>
            </>
          )}
          <span className="typography-metadata">•</span>
          <span className="typography-metadata text-muted-foreground/60">
            {t('expense.total', 'Total')}: {formatCurrency(amount, currency)}
          </span>
        </div>
      </div>

      {/* Share amount with direction context */}
      <div className="flex flex-col items-end ml-4 shrink-0">
        <span className={cn(
          "text-xs mb-1",
          isIOwe ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
        )}>
          {isIOwe
            ? t('debts.youOweLabel', 'You owe')
            : t('debts.theyOweLabel', 'They owe')}
        </span>
        <span className={cn(
          "typography-amount-prominent",
          isSelected && "text-primary",
          !isSelected && isIOwe && "text-red-600 dark:text-red-400",
          !isSelected && !isIOwe && "text-green-600 dark:text-green-400"
        )}>
          {formatCurrency(myShare, currency)}
        </span>
      </div>
    </div>
  );
}
