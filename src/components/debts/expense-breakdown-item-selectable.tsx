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
  status,
  isSettled,
  isSelected,
  onSelectChange,
}: ExpenseBreakdownItemSelectableProps) {
  const { t } = useTranslation();
  const go = useGo();

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
        "flex items-center gap-3 py-3 px-4 rounded-lg transition-colors border",
        isSelected && "border-primary bg-primary/5",
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

      {/* My Share - Prominent */}
      <div className="flex flex-col items-end ml-4">
        <span className="text-xs text-muted-foreground mb-1">
          {t('expense.myShare', 'My Share')}
        </span>
        <span className={cn("typography-amount-prominent", isSelected && "text-primary")}>
          {formatCurrency(myShare, currency)}
        </span>
      </div>
    </div>
  );
}
