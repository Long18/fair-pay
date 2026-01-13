import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BanknoteIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface WhatToPayNowPanelProps {
  totalAmount: number;
  selectedAmount: number;
  currency: string;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  onSettle: () => void;
  isSettling: boolean;
  isAllSelected: boolean;
  iOweThem: boolean;
}

export function WhatToPayNowPanel({
  totalAmount,
  selectedAmount,
  currency,
  selectedCount,
  totalCount,
  onSelectAll,
  onSettle,
  isSettling,
  isAllSelected,
  iOweThem,
}: WhatToPayNowPanelProps) {
  const { t } = useTranslation();

  if (!iOweThem) {
    return (
      <Card className="border-success/20 bg-success/5 rounded-xl">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <CheckCircle2Icon className="h-5 w-5 text-success" />
          <span className="typography-body text-success font-medium">
            {t('debts.theyOweYou', 'They owe you money')}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (totalAmount === 0) {
    return (
      <Card className="border-success/20 bg-success/5 rounded-xl">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <CheckCircle2Icon className="h-5 w-5 text-success" />
          <span className="typography-body text-success font-medium">
            {t('debts.allSettled', 'All settled up!')}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 typography-section-title">
          <BanknoteIcon className="h-5 w-5" />
          {t('debts.whatToPayNow', 'What to Pay Now')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="flex items-center justify-between p-4 bg-background rounded-lg">
          <div>
            <p className="typography-metadata mb-1">
              {selectedCount > 0
                ? t('debts.selectedExpenses', 'Selected ({{count}} of {{total}})', {
                    count: selectedCount,
                    total: totalCount,
                  })
                : t('debts.totalOutstanding', 'Total Outstanding')}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(selectedCount > 0 ? selectedAmount : totalAmount, currency)}
            </p>
          </div>
        </div>

        {/* Select All */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={isAllSelected}
            onCheckedChange={onSelectAll}
          />
          <label
            htmlFor="select-all"
            className="typography-body cursor-pointer select-none"
          >
            {t('debts.selectAll', 'Select all unsettled expenses')}
          </label>
        </div>

        {/* Settle Button */}
        <Button
          onClick={onSettle}
          disabled={isSettling || selectedCount === 0}
          className="w-full"
          size="lg"
        >
          {isSettling
            ? t('debts.settling', 'Settling...')
            : selectedCount > 0
            ? t('debts.settleSelected', 'Settle Selected')
            : t('debts.selectExpenses', 'Select expenses to settle')}
        </Button>

        {/* Payment Note */}
        <p className="typography-metadata text-center">
          {t('debts.manualSettlementNote', 'Settlements are marked manually. Actual payment is your responsibility.')}
        </p>
      </CardContent>
    </Card>
  );
}
