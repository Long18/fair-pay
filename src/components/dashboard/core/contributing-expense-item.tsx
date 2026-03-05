import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useGo } from "@refinedev/core";
import { CategoryIcon } from "@/modules/expenses/components/category-icon";
import { useHaptics } from "@/hooks/use-haptics";

interface ContributingExpenseItemProps {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  groupName?: string | null;
  category?: string | null;
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
  category,
  myShare,
  status,
  isSettled,
}: ContributingExpenseItemProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div
      onClick={() => { tap(); go({ to: `/expenses/show/${id}` }); }}
      className={cn(
        "flex items-center gap-3 py-2.5 px-3 rounded-md transition-colors cursor-pointer",
        "hover:bg-muted/50 active:bg-muted/80",
        isSettled && "opacity-50"
      )}
    >
      <CategoryIcon category={category} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn("text-sm font-medium truncate", isSettled && "line-through text-muted-foreground")}>
            {description}
          </p>
          <PaymentStateBadge state={status} size="sm" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {formatDate(expenseDate)}
          </span>
          {groupName && (
            <>
              <span className="text-xs text-muted-foreground/40">·</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {groupName}
              </Badge>
            </>
          )}
          <span className="text-xs text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground/60 tabular-nums">
            {t('expense.total', 'Total')}: {formatCurrency(amount, currency)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end ml-2 shrink-0">
        <span className="text-[10px] text-muted-foreground mb-0.5">
          {t('expense.myShare', 'My Share')}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(myShare, currency)}
        </span>
      </div>
    </div>
  );
}
