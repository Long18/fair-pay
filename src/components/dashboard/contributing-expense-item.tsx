import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useGo } from "@refinedev/core";

interface ContributingExpenseItemProps {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  groupName?: string | null;
  myShare: number;
  status: 'paid' | 'unpaid' | 'partial';
  isSettled: boolean;
}

export function ContributingExpenseItem({
  id,
  description,
  amount,
  currency,
  expenseDate,
  groupName,
  myShare,
  status,
  isSettled,
}: ContributingExpenseItemProps) {
  const { t } = useTranslation();
  const go = useGo();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div
      onClick={() => go({ to: `/expenses/show/${id}` })}
      className={cn(
        "flex items-center justify-between py-3 px-4 rounded-lg transition-colors cursor-pointer",
        "hover:bg-muted/50 active:bg-muted/80",
        isSettled && "opacity-60"
      )}
    >
      <div className="flex-1 min-w-0">
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
      <div className="flex flex-col items-end ml-4">
        <span className="text-xs text-muted-foreground mb-1">
          {t('expense.myShare', 'My Share')}
        </span>
        <span className="typography-amount-prominent">
          {formatCurrency(myShare, currency)}
        </span>
      </div>
    </div>
  );
}
