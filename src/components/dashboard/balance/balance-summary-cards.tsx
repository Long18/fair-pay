import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency as formatCurrencyUtil } from "@/lib/locale-utils";

import { ArrowDownIcon, ArrowUpIcon, WalletIcon } from "@/components/ui/icons";
interface BalanceSummaryCardsProps {
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  currency?: string;
}

export const BalanceSummaryCards = ({
  totalOwedToMe,
  totalIOwe,
  netBalance,
  currency = "VND",
}: BalanceSummaryCardsProps) => {
  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, currency);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Owed to Me */}
      <Card className="border-border hover:shadow-md transition-shadow rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
              <ArrowDownIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium">You are owed</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
                {formatCurrency(totalOwedToMe)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total I Owe */}
      <Card className="border-border hover:shadow-md transition-shadow rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <ArrowUpIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium">You owe</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 tabular-nums">
                {formatCurrency(totalIOwe)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Balance */}
      <Card className="border-border hover:shadow-md transition-shadow rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${
              netBalance >= 0
                ? "bg-purple-50 dark:bg-purple-950/30"
                : "bg-orange-50 dark:bg-orange-950/30"
            }`}>
              <WalletIcon className={`h-6 w-6 ${
                netBalance >= 0
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-orange-600 dark:text-orange-400"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium">Net balance</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${
                netBalance >= 0
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-orange-600 dark:text-orange-400"
              }`}>
                {netBalance >= 0 ? "+" : ""}{formatCurrency(netBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
