import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { CategoryIcon } from "@/modules/expenses/components/category-icon";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Link } from "react-router";
import {
  CheckCircle2Icon,
  EyeIcon,
  MoreVerticalIcon,
} from "@/components/ui/icons";

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
  status,
  isSettled,
  settledAt,
  isSelected,
  onSelectChange,
  onInlineSettle,
  canSettle = false,
}: ExpenseBreakdownItemSelectableProps) {
  const { t, i18n } = useTranslation();

  const isIOwe = direction === "i_owe";

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    if (checked !== "indeterminate") {
      onSelectChange(splitId, checked);
    }
  };

  const expenseUrl = `/expenses/show/${id}`;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 py-3 px-4 transition-colors border-b border-border",
        "bg-card relative",
        isSelected && "bg-primary/5 border-l-[3px] border-l-primary pl-[13px]",
        !isSelected && "hover:bg-muted/50"
      )}
    >
      {/* Checkbox — hover or selected */}
      {!isSettled && (
        <div
          className={cn(
            "shrink-0 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${description}`}
          />
        </div>
      )}

      {/* Category Icon + Body — wrapped in <Link> for proper navigation */}
      <Link
        to={expenseUrl}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0">
          <CategoryIcon category={category} size="sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p
              className={cn(
                "text-sm font-semibold truncate",
                isSettled && "line-through text-muted-foreground"
              )}
            >
              {description}
            </p>
            {status === "partial" && (
              <PaymentStateBadge state={status} size="sm" />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[11px] font-medium px-1.5 py-0.5 rounded",
                isSettled
                  ? "bg-muted text-muted-foreground border border-border"
                  : isIOwe
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
              )}
            >
              {isSettled
                ? `${paidByName} · ${t("debts.settled", "Settled")}`
                : `${paidByName} ${t("debts.paid", "paid")}`}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDate(expenseDate)}
            </span>
            {isSettled && settledAt && (
              <span className="text-[10px] text-muted-foreground/70">
                {t("debts.settledOn", "settled {{date}}", {
                  date: formatDate(settledAt),
                })}
              </span>
            )}
            {groupName && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-normal"
              >
                {groupName}
              </Badge>
            )}
          </div>
        </div>
      </Link>

      {/* Right: direction + amount + inline settle */}
      <div className="flex flex-col items-end ml-2 shrink-0 gap-1">
        {!isSettled && (
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              isIOwe
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            )}
          >
            {isIOwe
              ? t("debts.youOweLabel", "You owe")
              : t("debts.theyOweLabel", "Owes you")}
          </span>
        )}
        {isSettled && (
          <CheckCircle2Icon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span
          className={cn(
            "text-[15px] font-bold tabular-nums",
            isSelected && "text-primary",
            !isSelected && isSettled && "text-muted-foreground font-medium",
            !isSelected && !isSettled && isIOwe && "text-red-600 dark:text-red-400",
            !isSelected && !isSettled && !isIOwe && "text-green-600 dark:text-green-400"
          )}
        >
          {formatCurrency(myShare, currency)}
        </span>

        {/* Action dropdown — matches app-wide pattern */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 shrink-0",
                "opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
              aria-label={t("common.actions", "Actions")}
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={expenseUrl}>
                <EyeIcon className="h-4 w-4 mr-2" />
                {t("debts.viewDetails", "View Details")}
              </Link>
            </DropdownMenuItem>
            {!isSettled && canSettle && onInlineSettle && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onInlineSettle(splitId)}
                >
                  <CheckCircle2Icon className="h-4 w-4 mr-2" />
                  {t("debts.settle", "Settle")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
