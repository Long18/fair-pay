import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon, CheckCircle2Icon, UsersIcon } from "@/components/ui/icons";

interface DebtSummary {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string;
  amount: number;
  currency: string;
  i_owe_them: boolean;
  remaining_amount?: number; // For filtering settled debts
}

interface ProfileBalanceSummaryProps {
  debts: DebtSummary[];
  className?: string;
  variant?: "compact" | "detailed";
  showHistory?: boolean; // If false, only show unsettled debts in totals
}

export const ProfileBalanceSummary = ({
  debts,
  className,
  variant = "detailed",
  showHistory = false,
}: ProfileBalanceSummaryProps) => {
  const { t } = useTranslation();

  // Filter out settled debts when showHistory is false
  const activeDebts = showHistory
    ? debts
    : debts.filter(debt => {
        const amount = Number(debt.amount || 0);
        const remainingAmount = Number(debt.remaining_amount || debt.amount || 0);
        return amount !== 0 && remainingAmount !== 0;
      });

  // Helper to format amounts
  const displayAmount = (amount: number, currency: string) => {
    return formatCurrency(amount, currency);
  };

  // Group debts by currency (using filtered activeDebts)
  const debtsByCurrency = activeDebts.reduce((acc, debt) => {
    const currency = debt.currency || "USD"; // Fallback to USD for legacy data
    if (!acc[currency]) {
      acc[currency] = [];
    }
    acc[currency].push(debt);
    return acc;
  }, {} as Record<string, DebtSummary[]>);

  // Get sorted list of currencies (put USD first if present)
  const currencies = Object.keys(debtsByCurrency).sort((a, b) => {
    if (a === "USD") return -1;
    if (b === "USD") return 1;
    return a.localeCompare(b);
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Calculate totals for each currency - use remaining_amount (unpaid) when available
  const currencySummaries = currencies.map(currency => {
    const currencyDebts = debtsByCurrency[currency];
    const totalOwedToMe = currencyDebts
      .filter(d => !d.i_owe_them)
      .reduce((sum, d) => {
        // Use remaining_amount (unpaid) if available, otherwise use amount
        const amountToUse = d.remaining_amount !== undefined ? d.remaining_amount : d.amount;
        return sum + Math.abs(amountToUse);
      }, 0);

    const totalIOwe = currencyDebts
      .filter(d => d.i_owe_them)
      .reduce((sum, d) => {
        // Use remaining_amount (unpaid) if available, otherwise use amount
        const amountToUse = d.remaining_amount !== undefined ? d.remaining_amount : d.amount;
        return sum + Math.abs(amountToUse);
      }, 0);

    const netBalance = totalOwedToMe - totalIOwe;
    const owedToMeCount = currencyDebts.filter(d => !d.i_owe_them).length;
    const iOweCount = currencyDebts.filter(d => d.i_owe_them).length;

    return {
      currency,
      totalOwedToMe,
      totalIOwe,
      netBalance,
      owedToMeCount,
      iOweCount,
    };
  });

  // If no active debts, show empty state
  if (activeDebts.length === 0) {
    return (
      <Card className={cn("rounded-lg p-6 text-center", className)}>
        <CheckCircle2Icon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {t('profile.noOutstandingBalances', 'No outstanding balances')}
        </p>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn("space-y-4", className)}
      >
        {currencySummaries.map(({ currency, totalOwedToMe, totalIOwe, netBalance, owedToMeCount, iOweCount }) => (
          <div key={currency} className="space-y-2">
            {currencies.length > 1 && (
              <Badge variant="outline" className="mb-2">
                {currency}
              </Badge>
            )}
            <div className="grid grid-cols-3 gap-3">
              <motion.div variants={itemVariants} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('profile.netBalance', 'Net Balance')}
                </p>
                <p className={cn(
                  "font-bold text-lg",
                  netBalance > 0 ? "text-green-600 dark:text-green-400" :
                  netBalance < 0 ? "text-red-600 dark:text-red-400" :
                  "text-muted-foreground"
                )}>
                  {displayAmount(Math.abs(netBalance), currency)}
                </p>
                <Badge
                  variant={netBalance > 0 ? "default" : netBalance < 0 ? "destructive" : "secondary"}
                  className={cn(
                    "mt-1 text-xs",
                    netBalance > 0 && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}
                >
                  {netBalance > 0 ? t('profile.owesYou', 'owes you') :
                   netBalance < 0 ? t('profile.youOwe', 'you owe') :
                   t('profile.settled', 'settled')}
                </Badge>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('profile.owedToYou', 'Owed to You')}
                </p>
                <p className="font-bold text-lg text-green-600 dark:text-green-400">
                  {displayAmount(totalOwedToMe, currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {owedToMeCount} {t('profile.debts', 'debts')}
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('profile.youOweTotal', 'You Owe')}
                </p>
                <p className="font-bold text-lg text-red-600 dark:text-red-400">
                  {displayAmount(totalIOwe, currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {iOweCount} {t('profile.debts', 'debts')}
                </p>
              </motion.div>
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  // Detailed variant with cards
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-6", className)}
    >
      {currencySummaries.map(({ currency, totalOwedToMe, totalIOwe, netBalance, owedToMeCount, iOweCount }) => (
        <div key={currency} className="space-y-4">
          {currencies.length > 1 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {currency}
              </Badge>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Net Balance Card */}
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden rounded-lg">
                <div className={cn(
                  "absolute inset-0 opacity-10",
                  netBalance > 0 ? "bg-gradient-to-br from-green-500 to-emerald-500" :
                  netBalance < 0 ? "bg-gradient-to-br from-red-500 to-rose-500" :
                  "bg-gradient-to-br from-gray-500 to-slate-500"
                )} />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('profile.netBalance', 'Net Balance')}
                    </p>
                    {netBalance === 0 ? (
                      <CheckCircle2Icon size={20} className="text-muted-foreground" />
                    ) : netBalance > 0 ? (
                      <ArrowUpIcon size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDownIcon size={20} className="text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <p className={cn(
                    "text-2xl font-bold mb-2",
                    netBalance > 0 ? "text-green-600 dark:text-green-400" :
                    netBalance < 0 ? "text-red-600 dark:text-red-400" :
                    "text-muted-foreground"
                  )}>
                    {displayAmount(Math.abs(netBalance), currency)}
                  </p>
                  <Badge
                    variant={netBalance > 0 ? "default" : netBalance < 0 ? "destructive" : "secondary"}
                    className={cn(
                      "rounded-full",
                      netBalance > 0 && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    )}
                  >
                    {netBalance > 0 ? t('profile.owesYou', 'owes you') :
                     netBalance < 0 ? t('profile.youOwe', 'you owe') :
                     t('profile.settled', 'settled')}
                  </Badge>
                </div>
              </Card>
            </motion.div>

            {/* Owed to You Card */}
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden rounded-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('profile.owedToYou', 'Owed to You')}
                    </p>
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <UsersIcon size={16} />
                      <span className="text-sm font-medium">{owedToMeCount}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {displayAmount(totalOwedToMe, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {owedToMeCount === 0
                      ? t('profile.noOneOwesYou', 'No one owes you')
                      : t('profile.peopleOweYou', {
                          count: owedToMeCount,
                          defaultValue: `${owedToMeCount} ${owedToMeCount === 1 ? 'person owes' : 'people owe'} you`
                        })
                    }
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* You Owe Card */}
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden rounded-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/10" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('profile.youOweTotal', 'You Owe')}
                    </p>
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <UsersIcon size={16} />
                      <span className="text-sm font-medium">{iOweCount}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                    {displayAmount(totalIOwe, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {iOweCount === 0
                      ? t('profile.youOweNoOne', 'You owe no one')
                      : t('profile.youOwePeople', {
                          count: iOweCount,
                          defaultValue: `You owe ${iOweCount} ${iOweCount === 1 ? 'person' : 'people'}`
                        })
                    }
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      ))}
    </motion.div>
  );
};
