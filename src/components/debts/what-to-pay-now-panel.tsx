import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BanknoteIcon, CheckCircle2Icon, Trash2Icon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";

interface WhatToPayNowPanelProps {
  totalAmount: number;
  selectedAmount: number;
  currency: string;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  onSettle: () => void;
  onDelete?: () => void;
  isSettling: boolean;
  isDeleting?: boolean;
  isAllSelected: boolean;
  iOweThem: boolean;
  isAdmin?: boolean;
}

export function WhatToPayNowPanel({
  totalAmount,
  selectedAmount,
  currency,
  selectedCount,
  totalCount,
  onSelectAll,
  onSettle,
  onDelete,
  isSettling,
  isDeleting = false,
  isAllSelected,
  iOweThem,
  isAdmin = false,
}: WhatToPayNowPanelProps) {
  const { t } = useTranslation();

  // Creditor view (they owe you) — only show actions if admin or creditor
  const canSettle = iOweThem || !iOweThem; // both can settle
  const canDelete = isAdmin;

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
          {iOweThem
            ? t('debts.whatToPayNow', 'What to Pay Now')
            : t('debts.whatTheyOwe', 'What They Owe')}
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Settle Button */}
          {canSettle && (
            <Button
              onClick={onSettle}
              disabled={isSettling || selectedCount === 0}
              className="flex-1"
              size="lg"
            >
              {isSettling
                ? t('debts.settling', 'Settling...')
                : selectedCount > 0
                ? t('debts.settleSelected', 'Settle Selected')
                : t('debts.selectExpenses', 'Select expenses to settle')}
            </Button>
          )}

          {/* Delete Button (Admin only) */}
          {canDelete && onDelete && (
            <Button
              onClick={onDelete}
              disabled={isDeleting || selectedCount === 0}
              variant="destructive"
              size="lg"
            >
              <Trash2Icon className="h-4 w-4 mr-2" />
              {isDeleting
                ? t('debts.deleting', 'Deleting...')
                : t('debts.deleteSelected', 'Delete')}
            </Button>
          )}
        </div>

        {/* Payment Note */}
        <p className="typography-metadata text-center">
          {iOweThem
            ? t('debts.manualSettlementNote', 'Settlements are marked manually. Actual payment is your responsibility.')
            : t('debts.creditorSettlementNote', 'Mark expenses as settled when payment is received.')}
        </p>
      </CardContent>
    </Card>
  );
}
