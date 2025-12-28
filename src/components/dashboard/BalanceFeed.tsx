import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { BalanceRow } from "./BalanceRow";
import { useGo } from "@refinedev/core";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

import { ArrowDownIcon, ArrowUpIcon, WalletIcon } from "@/components/ui/icons";
interface BalanceFeedProps {
  disabled?: boolean;
}

export function BalanceFeed({ disabled = false }: BalanceFeedProps) {
  const { data: debts = [], isLoading } = useAggregatedDebts();
  const go = useGo();
  const { t } = useTranslation();

  const handleRowClick = (counterpartyId: string) => {
    if (!disabled) {
      go({ to: `/profile/${counterpartyId}` });
    }
  };

  const owedToMe = debts.filter(debt => !debt.i_owe_them);
  const iOwe = debts.filter(debt => debt.i_owe_them);

  const totalOwedToMe = owedToMe.reduce((sum, debt) => sum + Number(debt.amount), 0);
  const totalIOwe = iOwe.reduce((sum, debt) => sum + Number(debt.amount), 0);
  const netBalance = totalOwedToMe - totalIOwe;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">{t('dashboard.activeBalances')}</h2>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">{t('dashboard.activeBalances')}</h2>

        {/* Summary Cards - All Zero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Owed to Me */}
          <Card className="border-gray-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-xl">
                  <ArrowDownIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Owed to you</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    ₫0
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total I Owe */}
          <Card className="border-gray-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <ArrowUpIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">You owe</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ₫0
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Balance */}
          <Card className="border-gray-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <WalletIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Net balance</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    ₫0
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">All settled up! 🎉</p>
          <p className="text-xs mt-1">No outstanding debts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">{t('dashboard.activeBalances')}</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Owed to Me */}
        <Card className="border-gray-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <ArrowDownIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Owed to you</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  ₫{formatCurrency(totalOwedToMe)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total I Owe */}
        <Card className="border-gray-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <ArrowUpIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">You owe</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₫{formatCurrency(totalIOwe)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className="border-gray-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                netBalance >= 0 ? "bg-purple-50" : "bg-orange-50"
              }`}>
                <WalletIcon className={`h-6 w-6 ${
                  netBalance >= 0 ? "text-purple-600" : "text-orange-600"
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Net balance</p>
                <p className={`text-2xl font-bold mt-1 ${
                  netBalance >= 0 ? "text-purple-600" : "text-orange-600"
                }`}>
                  {netBalance >= 0 ? "+" : ""}₫{formatCurrency(netBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {owedToMe.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Owed to you
          </h3>
          {owedToMe.map((debt) => (
            <BalanceRow
              key={debt.counterparty_id}
              counterpartyName={debt.counterparty_name}
              groupName="Friend"
              amount={debt.amount}
              iOweThemFlag={debt.i_owe_them}
              onClick={() => handleRowClick(debt.counterparty_id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {iOwe.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            You owe
          </h3>
          {iOwe.map((debt) => (
            <BalanceRow
              key={debt.counterparty_id}
              counterpartyName={debt.counterparty_name}
              groupName="Friend"
              amount={debt.amount}
              iOweThemFlag={debt.i_owe_them}
              onClick={() => handleRowClick(debt.counterparty_id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
