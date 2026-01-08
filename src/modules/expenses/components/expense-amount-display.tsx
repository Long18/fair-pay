import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ExpenseAmountDisplayProps {
  expense: any;
  className?: string;
}

export const ExpenseAmountDisplay = ({ expense, className }: ExpenseAmountDisplayProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        "p-4 md:p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/10",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
        {/* Payer Avatar */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
          <Avatar className="relative h-14 w-14 sm:h-16 sm:w-16 border-4 border-background shadow-lg ring-4 ring-primary/10">
            <AvatarImage
              src={expense.profiles?.avatar_url || undefined}
              alt={expense.profiles?.full_name}
            />
            <AvatarFallback className="text-base sm:text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10">
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
            {t('expenses.paidBy')}
          </p>
          <p className="font-bold text-base sm:text-lg mt-1 line-clamp-1" title={expense.profiles?.full_name}>
            {expense.profiles?.full_name || t('profile.unknown')}
          </p>
        </div>

        {/* Divider - Hidden on mobile */}
        <div className="hidden sm:block h-12 w-px bg-border" />

        {/* Amount */}
        <div className="text-center sm:text-right">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">
            {t('expenses.totalAmount')}
          </p>
          <div className="flex items-baseline justify-center sm:justify-end gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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
