import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DebtRowExpandable } from "./debt-row-expandable";
import { useTranslation } from "react-i18next";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ScaleIcon } from "@/components/ui/icons";

interface Balance {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  amount: number;
  currency: string;
  i_owe_them: boolean;
  total_amount?: number;
  settled_amount?: number;
  remaining_amount?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

interface DebtBreakdownSectionProps {
  balances: Balance[];
  isLoading?: boolean;
}

export function DebtBreakdownSection({
  balances,
}: DebtBreakdownSectionProps) {
  const { t } = useTranslation();

  // Filter out fully settled balances (those with 0 remaining)
  const activeBalances = balances.filter(b => {
    const remaining = b.remaining_amount !== undefined ? b.remaining_amount : b.amount;
    return Number(remaining) !== 0;
  });

  if (activeBalances.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScaleIcon className="h-8 w-8" />
              </EmptyMedia>
              <EmptyTitle>
                {t('dashboard.allSettledUpNoDebts', 'All settled up!')}
              </EmptyTitle>
              <EmptyDescription>
                {t('dashboard.noOutstandingBalances', 'You have no outstanding balances. Everyone is settled up!')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="typography-section-title">
          {t('dashboard.debtBreakdown', 'Debt Breakdown')}
        </CardTitle>
        <p className="typography-metadata mt-1">
          {t('dashboard.debtBreakdownDescription', 'See which expenses contribute to each balance')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeBalances.map((balance) => (
          <DebtRowExpandable
            key={balance.counterparty_id}
            counterpartyId={balance.counterparty_id}
            counterpartyName={balance.counterparty_name}
            counterpartyAvatarUrl={balance.counterparty_avatar_url}
            amount={balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount}
            currency={balance.currency || 'VND'}
            iOweThem={balance.i_owe_them}
            transactionCount={balance.transaction_count}
            lastTransactionDate={balance.last_transaction_date}
          />
        ))}
      </CardContent>
    </Card>
  );
}
