import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle2Icon, ChevronDownIcon } from "@/components/ui/icons";
import { PaymentMethodDropdown } from "@/modules/payments/components/payment-method-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { formatNumber } from "@/lib/locale-utils";
import { getPaymentStateColors } from "@/lib/status-colors";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/hooks/use-haptics";
import type { ExpenseSplit } from "@/modules/expenses/types";

type SplitWithProfile = ExpenseSplit & {
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
  };
};

interface ExpenseSplitCardProps {
  split: SplitWithProfile;
  expense: {
    is_payment?: boolean;
    currency: string;
    paid_by_user_id: string;
  };
  isCurrentUser: boolean;
  isPayer: boolean;
  canSettle: boolean;
  isSettling: boolean;
  isLoan?: boolean;
  onSettle: (split: SplitWithProfile) => void;
  onPaymentComplete: () => void;
}

export const ExpenseSplitCard = ({
  split,
  expense,
  isCurrentUser,
  isPayer,
  canSettle,
  isSettling,
  isLoan,
  onSettle,
  onPaymentComplete,
}: ExpenseSplitCardProps) => {
  const { t } = useTranslation();
  const { tap, success } = useHaptics();
  const [isExpanded, setIsExpanded] = useState(false);

  const isSplitSettled = split.is_settled || expense.is_payment;
  const settledAmount = split.settled_amount ?? 0;
  const isPartiallySettled = split.is_settled && settledAmount < split.computed_amount;
  const remainingAmount = split.computed_amount - settledAmount;

  // Calculate partial percentage for badge
  const partialPercentage = isPartiallySettled
    ? Math.round((settledAmount / split.computed_amount) * 100)
    : undefined;

  const getPaymentState = (): "paid" | "unpaid" | "partial" | null => {
    if (isSplitSettled && !isPartiallySettled) {
      return "paid";
    }
    if (isPartiallySettled) {
      return "partial";
    }
    if (!isSplitSettled && !isCurrentUser) {
      return "unpaid";
    }
    return null;
  };

  const paymentState = getPaymentState();
  
  // Get status colors for settled state
  const paidColors = getPaymentStateColors('paid');
  const partialColors = getPaymentStateColors('partial');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "group border-2 rounded-lg transition-all duration-200 overflow-hidden",
        isSplitSettled
          ? cn(paidColors.bg, paidColors.border)
          : isCurrentUser
            ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
            : "hover:border-primary/50 hover:bg-accent/30 bg-card"
      )}
    >
      {/* Main Content */}
      <div
        className={cn(
          "p-4 cursor-pointer",
          "md:cursor-default" // Disable expand on desktop
        )}
        onClick={() => {
          // Only allow expand on mobile
          if (window.innerWidth < 768) {
            tap();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* User Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className={cn(
              "h-10 w-10 md:h-12 md:w-12 border-2 shadow-sm ring-2 ring-offset-1 ring-offset-background transition-all duration-200 flex-shrink-0",
              isSplitSettled
                ? cn(paidColors.border, "ring-status-success-border")
                : "border-background ring-primary/20 group-hover:ring-primary/50"
            )}>
              <AvatarImage src={split.profiles?.avatar_url || undefined} alt={split.profiles?.full_name} />
              <AvatarFallback className={cn(
                "text-xs md:text-sm font-semibold",
                isSplitSettled
                  ? cn(paidColors.bg, paidColors.text)
                  : "bg-gradient-to-br from-muted to-muted/50"
              )}>
                {split.profiles?.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className={cn(
                "font-semibold text-sm md:text-base truncate transition-colors",
                isSplitSettled ? paidColors.text : "group-hover:text-primary"
              )}>
                {split.profiles?.full_name || split.pending_email || t('profile.unknown')}
                {isCurrentUser && (
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    ({t('common.you')})
                  </span>
                )}
              </div>

              {/* Mobile: Show basic info */}
              <div className="flex items-center gap-2 mt-1 md:hidden">
                <span className="text-xs text-muted-foreground">
                  {isLoan
                    ? (isPayer ? t('expenses.lender') : t('expenses.borrower'))
                    : String(t(`expenses.${split.split_method}`, split.split_method))}
                </span>
                {paymentState && (
                  <PaymentStateBadge
                    state={paymentState}
                    percentage={partialPercentage}
                    size="sm"
                  />
                )}
              </div>

              {/* Desktop: Show full info */}
              <div className="hidden md:flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {isLoan
                    ? (isPayer ? t('expenses.lender') : t('expenses.borrower'))
                    : String(t(`expenses.${split.split_method}`, split.split_method))}
                </span>
                {paymentState && (
                  <PaymentStateBadge
                    state={paymentState}
                    percentage={partialPercentage}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Amount and Actions - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex flex-col items-end">
              {isPartiallySettled ? (
                <>
                  <div className={cn("font-bold text-lg", partialColors.text)}>
                    {formatNumber(remainingAmount)} {expense.currency}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('expenses.remaining', 'Remaining')} ({formatNumber(settledAmount)} / {formatNumber(split.computed_amount)} {t('expenses.paid', 'paid')})
                  </div>
                </>
              ) : (
                <div className={cn(
                  "font-bold text-lg",
                  isSplitSettled ? paidColors.icon : ""
                )}>
                  {formatNumber(split.computed_amount)} {expense.currency}
                </div>
              )}
            </div>

            {/* Action Buttons with Tooltips - Ensure 44x44px touch targets */}
            {canSettle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-status-success-foreground hover:bg-status-success-foreground/90 min-h-[44px] min-w-[44px]"
                    onClick={() => { success(); onSettle(split); }}
                    disabled={isSettling}
                  >
                    {isSettling ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2Icon className="h-4 w-4 mr-1" />
                        {t('expenses.settle', 'Settle')}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" maxWidth="300px">
                  {t('expenses.settleTooltip', 'Mark this payment as received manually (no money transfer)')}
                </TooltipContent>
              </Tooltip>
            )}

            {!canSettle && !isSplitSettled && !isCurrentUser && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="cursor-not-allowed min-h-[44px] min-w-[44px]"
                  >
                    <CheckCircle2Icon className="h-4 w-4 mr-1" />
                    {t('expenses.settle', 'Settle')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" maxWidth="300px">
                  {t('expenses.noPermissionTooltip', 'Only the payer or admin can mark this as settled')}
                </TooltipContent>
              </Tooltip>
            )}

            {isCurrentUser && !isSplitSettled && !isPayer && split.user_id && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <PaymentMethodDropdown
                      split={split}
                      payeeId={expense.paid_by_user_id}
                      onPaymentComplete={onPaymentComplete}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" maxWidth="300px">
                  {t('expenses.payTooltip', 'Pay now via available payment methods')}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Amount - Mobile Only (Actions in dropdown) */}
          <div className="flex md:hidden items-center gap-2">
            <div className="text-right">
              <div className={cn(
                "font-bold text-base",
                isSplitSettled ? paidColors.icon : ""
              )}>
                {formatNumber(isPartiallySettled ? remainingAmount : split.computed_amount)}
              </div>
              <div className="text-xs text-muted-foreground">
                {expense.currency}
              </div>
            </div>

            {/* Expand Indicator - Mobile Only - Ensure 44x44px touch target */}
            <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronDownIcon
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Expanded Actions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t bg-muted/30"
          >
            <div className="p-4 space-y-3">
              {isPartiallySettled && (
                <div className="text-sm text-muted-foreground">
                  {formatNumber(settledAmount)} / {formatNumber(split.computed_amount)} {expense.currency} {t('expenses.paid', 'paid')}
                </div>
              )}

              <div className="flex gap-2">
                {canSettle && (
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 bg-status-success-foreground hover:bg-status-success-foreground/90 min-h-[44px]"
                    onClick={() => { success(); onSettle(split); }}
                    disabled={isSettling}
                  >
                    {isSettling ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2Icon className="h-4 w-4 mr-2" />
                        {t('expenses.markAsPaid', 'Mark as Paid')}
                      </>
                    )}
                  </Button>
                )}

                {isCurrentUser && !isSplitSettled && !isPayer && split.user_id && (
                  <PaymentMethodDropdown
                    split={split}
                    payeeId={expense.paid_by_user_id}
                    onPaymentComplete={onPaymentComplete}
                    className="flex-1 min-h-[44px]"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
