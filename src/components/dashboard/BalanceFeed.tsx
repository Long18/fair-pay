import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { BalanceRow } from "./BalanceRow";
import { useGo } from "@refinedev/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

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
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">{t('dashboard.activeBalances')}</h2>
      <div className="space-y-3">
        {debts.map((debt) => (
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
    </div>
  );
}
