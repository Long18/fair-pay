import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2Icon, XCircleIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
import { MomoPaymentButton } from "@/modules/payments/components/momo-payment-button";
import { formatNumber } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ExpenseSplitCardProps {
  split: any;
  expense: any;
  isCurrentUser: boolean;
  isPayer: boolean;
  canSettle: boolean;
  isSettling: boolean;
  onSettle: (split: any) => void;
  onPaymentComplete: () => void;
}

export const ExpenseSplitCard = ({
  split,
  expense,
  isCurrentUser,
  isPayer,
  canSettle,
  isSettling,
  onSettle,
  onPaymentComplete,
}: ExpenseSplitCardProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const isSplitSettled = split.is_settled || expense.is_payment;
  const isPartiallySettled = split.is_settled && split.settled_amount < split.computed_amount;
  const remainingAmount = split.computed_amount - (split.settled_amount || 0);

  const getStatusBadge = () => {
    if (isSplitSettled && !isPartiallySettled) {
      return (
        <Badge
          variant="outline"
          className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
        >
          <CheckCircle2Icon className="h-3 w-3 mr-1" />
          {t('expenses.paid', 'Paid')}
        </Badge>
      );
    }

    if (isPartiallySettled) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
        >
          <CheckCircle2Icon className="h-3 w-3 mr-1" />
          {t('expenses.partiallyPaid', 'Partially Paid')}
        </Badge>
      );
    }

    if (!isSplitSettled && !isCurrentUser) {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
        >
          <XCircleIcon className="h-3 w-3 mr-1" />
          {t('expenses.unpaid', 'Unpaid')}
        </Badge>
      );
    }

    return null;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "group border-2 rounded-lg transition-all duration-200 overflow-hidden",
        isSplitSettled
          ? "bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800"
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
                ? "border-green-300 dark:border-green-700 ring-green-200 dark:ring-green-800"
                : "border-background ring-primary/20 group-hover:ring-primary/50"
            )}>
              <AvatarImage src={split.profiles?.avatar_url || undefined} alt={split.profiles?.full_name} />
              <AvatarFallback className={cn(
                "text-xs md:text-sm font-semibold",
                isSplitSettled
                  ? "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950/40 dark:to-green-950/20 text-green-700 dark:text-green-300"
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
                isSplitSettled ? "text-green-700 dark:text-green-300" : "group-hover:text-primary"
              )}>
                {split.profiles?.full_name || t('profile.unknown')}
                {isCurrentUser && (
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    ({t('common.you')})
                  </span>
                )}
              </div>

              {/* Mobile: Show basic info */}
              <div className="flex items-center gap-2 mt-1 md:hidden">
                <span className="text-xs text-muted-foreground">
                  {String(t(`expenses.${split.split_method}`, split.split_method))}
                </span>
                {getStatusBadge()}
              </div>

              {/* Desktop: Show full info */}
              <div className="hidden md:flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {String(t(`expenses.${split.split_method}`, split.split_method))}
                </span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Amount and Actions - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex flex-col items-end">
              {isPartiallySettled ? (
                <>
                  <div className="font-bold text-lg text-amber-600 dark:text-amber-400">
                    {formatNumber(remainingAmount)} {expense.currency}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('expenses.remaining', 'Remaining')} ({formatNumber(split.settled_amount)} / {formatNumber(split.computed_amount)} {t('expenses.paid', 'paid')})
                  </div>
                </>
              ) : (
                <div className={cn(
                  "font-bold text-lg",
                  isSplitSettled ? "text-green-600 dark:text-green-400" : ""
                )}>
                  {formatNumber(split.computed_amount)} {expense.currency}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canSettle && (
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onSettle(split)}
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
            )}

            {isCurrentUser && !isSplitSettled && !isPayer && (
              <MomoPaymentButton
                split={split}
                onPaymentComplete={onPaymentComplete}
              />
            )}
          </div>

          {/* Amount - Mobile Only (Actions in dropdown) */}
          <div className="flex md:hidden items-center gap-2">
            <div className="text-right">
              <div className={cn(
                "font-bold text-base",
                isSplitSettled ? "text-green-600 dark:text-green-400" : ""
              )}>
                {formatNumber(isPartiallySettled ? remainingAmount : split.computed_amount)}
              </div>
              <div className="text-xs text-muted-foreground">
                {expense.currency}
              </div>
            </div>

            {/* Expand Indicator - Mobile Only */}
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
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
                  {formatNumber(split.settled_amount)} / {formatNumber(split.computed_amount)} {expense.currency} {t('expenses.paid', 'paid')}
                </div>
              )}

              <div className="flex gap-2">
                {canSettle && (
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => onSettle(split)}
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

                {isCurrentUser && !isSplitSettled && !isPayer && (
                  <div className="flex-1">
                    <MomoPaymentButton
                      split={split}
                      onPaymentComplete={onPaymentComplete}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
