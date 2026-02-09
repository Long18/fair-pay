import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ExpenseAmountDisplayProps {
  expense: any;
  className?: string;
  isLoan?: boolean;
  borrowerName?: string;
}

export const ExpenseAmountDisplay = ({ expense, className, isLoan, borrowerName }: ExpenseAmountDisplayProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        "p-4 md:p-6 rounded-xl border",
        isLoan
          ? "bg-gradient-to-br from-amber-50/50 via-amber-100/30 to-amber-50/50 dark:from-amber-950/30 dark:via-amber-900/20 dark:to-amber-950/30 border-amber-200/50 dark:border-amber-800/50"
          : "bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/10",
        className
      )}
    >
      {/* Loan Badge */}
      {isLoan && (
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>
            {t('expenses.loan')}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
        {/* Payer Avatar */}
        <div className="relative">
          <div className={cn(
            "absolute inset-0 rounded-full blur-xl",
            isLoan ? "bg-amber-400/20" : "bg-primary/20"
          )} />
          <Avatar className={cn(
            "relative h-14 w-14 sm:h-16 sm:w-16 border-4 border-background shadow-lg ring-4",
            isLoan ? "ring-amber-200/30 dark:ring-amber-800/30" : "ring-primary/10"
          )}>
            <AvatarImage
              src={expense.profiles?.avatar_url || undefined}
              alt={expense.profiles?.full_name}
            />
            <AvatarFallback className={cn(
              "text-base sm:text-lg font-bold bg-gradient-to-br",
              isLoan ? "from-amber-200/30 to-amber-100/20" : "from-primary/20 to-primary/10"
            )}>
              {expense.profiles?.full_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Payer Info */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">
            {isLoan ? t('expenses.lentBy') : t('expenses.paidBy')}
          </p>
          <p className="font-bold text-base sm:text-lg mt-1 line-clamp-1" title={expense.profiles?.full_name}>
            {expense.profiles?.full_name || t('profile.unknown')}
          </p>
          {isLoan && borrowerName && (
            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-0.5">
              {t('expenses.lentTo', { name: borrowerName })}
            </p>
          )}
        </div>

        {/* Divider - Hidden on mobile */}
        <div className="hidden sm:block h-12 w-px bg-border" />

        {/* Amount */}
        <div className="text-center sm:text-right">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">
            {isLoan ? t('expenses.loanAmount') : t('expenses.totalAmount')}
          </p>
          <div className="flex items-baseline justify-center sm:justify-end gap-2 mt-1">
            <span className={cn(
              "text-2xl sm:text-3xl font-bold bg-clip-text text-transparent",
              isLoan
                ? "bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300"
                : "bg-gradient-to-r from-primary to-primary/70"
            )}>
              {formatNumber(expense.amount)}
            </span>
            <span className="text-lg sm:text-xl font-semibold text-muted-foreground">
              {expense.currency}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
