import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { ContributingExpensesList } from "@/components/dashboard/core/contributing-expenses-list";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { getOweStatusColors, getPaymentStateColors } from "@/lib/status-colors";
import { formatCurrency } from "@/lib/locale-utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Balance {
  counterparty_id: string | null;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  counterparty_email?: string;
  amount: string | number;
  currency?: string;
  i_owe_them: boolean;
  total_amount?: number;
  settled_amount?: number;
  remaining_amount?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

interface BalanceTableRowExpandableProps {
  balance: Balance;
  index: number;
  disabled: boolean;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function BalanceTableRowExpandable({
  balance,
  index,
  disabled,
  currency,
  isExpanded,
  onToggleExpand,
}: BalanceTableRowExpandableProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { expenses, isLoading } = useContributingExpenses(balance.counterparty_id || "");

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return '';
    }
  };

  const amountValue = Number(balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount);
  const isFullySettled = amountValue === 0;

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer transition-colors",
          index % 2 === 0 && "bg-muted/50 dark:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed",
          isFullySettled && `opacity-60 ${getPaymentStateColors('paid').bg}`,
          "hover:bg-muted/80"
        )}
        onClick={() => !disabled && onToggleExpand()}
      >
        <TableCell>
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={balance.counterparty_avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {balance.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {isFullySettled && (
              <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors('paid').bg)}>
                <CheckIcon className={cn("h-3 w-3", getPaymentStateColors('paid').icon)} />
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className={cn("typography-row-title", isFullySettled && "line-through text-muted-foreground")}>
              {balance.counterparty_name}
            </span>
            {balance.last_transaction_date && (
              <span className="typography-metadata">
                {t('dashboard.last', 'Last')}: {formatDate(balance.last_transaction_date)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          {isFullySettled ? (
            <PaymentStateBadge state="paid" size="md" />
          ) : (
            <Badge variant={balance.i_owe_them ? "default" : "secondary"}>
              {balance.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {isFullySettled ? (
              <span className={cn("flex items-center gap-1 typography-amount tabular-nums", getPaymentStateColors('paid').text)}>
                <CheckIcon className="h-4 w-4" />
                {formatCurrency(0, currency)}
              </span>
            ) : (
              <span className="typography-amount-prominent tabular-nums">
                {formatCurrency(amountValue, currency)}
              </span>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            </motion.div>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Content Row */}
      <AnimatePresence>
        {isExpanded && (
          <TableRow className={cn(index % 2 === 0 && "bg-muted/50 dark:bg-muted/30")}>
            <TableCell colSpan={4} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t bg-muted/10">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {t('dashboard.contributingExpenses', 'Contributing Expenses')}
                  </h4>

                  <ContributingExpensesList
                    expenses={expenses}
                    counterpartyId={balance.counterparty_id || ""}
                    isLoading={isLoading}
                  />

                  {balance.counterparty_id && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full mt-3 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      go({ to: `/debts/${balance.counterparty_id}` });
                    }}
                  >
                    {t('dashboard.viewFullBreakdown', 'View Details')}
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                  )}
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}

// Mobile Card Wrapper Component
export function BalanceTableRowExpandableMobile({
  balance,
  disabled,
  currency,
  isExpanded,
  onToggleExpand,
}: Omit<BalanceTableRowExpandableProps, 'index'>) {
  const { t } = useTranslation();
  const go = useGo();
  const { expenses, isLoading } = useContributingExpenses(balance.counterparty_id || "");

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return '';
    }
  };

  const statusColors = balance.i_owe_them
    ? getOweStatusColors('owe')
    : getOweStatusColors('owed');

  const amountValue = Number(balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount);
  const isFullySettled = amountValue === 0;

  return (
    <div className="border rounded-md overflow-hidden bg-card transition-shadow hover:shadow-sm">
      {/* Main Card - Clickable to expand */}
      <div
        onClick={() => !disabled && onToggleExpand()}
        className={cn(
          "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarImage src={balance.counterparty_avatar_url || undefined} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {balance.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {isFullySettled && (
              <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors('paid').bg)}>
                <CheckIcon className={cn("h-3 w-3", getPaymentStateColors('paid').icon)} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("typography-row-title truncate", isFullySettled && "line-through text-muted-foreground")}>
              {balance.counterparty_name}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isFullySettled ? (
                <PaymentStateBadge state="paid" size="sm" />
              ) : (
                <Badge variant={balance.i_owe_them ? "default" : "secondary"} className="text-xs">
                  {balance.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
                </Badge>
              )}
              {balance.transaction_count !== undefined && (
                <>
                  <span className="typography-metadata">·</span>
                  <span className="typography-metadata tabular-nums">
                    {balance.transaction_count} {t('dashboard.expenses', 'expenses')}
                  </span>
                </>
              )}
              {balance.last_transaction_date && (
                <>
                  <span className="typography-metadata">·</span>
                  <span className="typography-metadata">
                    {t('dashboard.last', 'Last')}: {formatDate(balance.last_transaction_date)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {isFullySettled ? (
            <span className={cn("flex items-center gap-1 typography-amount tabular-nums", getPaymentStateColors('paid').text)}>
              <CheckIcon className="h-4 w-4" />
              {formatCurrency(0, currency)}
            </span>
          ) : (
            <span className={cn("typography-amount-prominent tabular-nums", statusColors.text)}>
              {balance.i_owe_them ? '-' : '+'}
              {formatCurrency(Math.abs(amountValue), currency)}
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-t bg-muted/10 overflow-hidden"
          >
            <div className="p-3 space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('dashboard.contributingExpenses', 'Contributing Expenses')}
              </h4>

              <ContributingExpensesList
                expenses={expenses}
                counterpartyId={balance.counterparty_id || ""}
                isLoading={isLoading}
                participants={participants}
              />

              {balance.counterparty_id && (
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  go({ to: `/debts/${balance.counterparty_id}` });
                }}
              >
                {t('dashboard.viewFullBreakdown', 'View Details')}
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
