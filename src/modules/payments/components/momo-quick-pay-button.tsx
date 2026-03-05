import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BanknoteIcon, AlertCircleIcon } from '@/components/ui/icons';
import { supabaseClient } from '@/utility/supabaseClient';
import { ExpenseSplit } from '@/modules/expenses/types';
import { MomoPaymentButton } from './momo-payment-button';
import { momoAPI } from '@/lib/momo/api';
import { formatNumber } from '@/lib/locale-utils';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-haptics';

interface MomoQuickPayButtonProps {
  counterpartyId: string;
  counterpartyName: string;
  counterpartyAvatar?: string | null;
  totalAmount: number;
  className?: string;
}

export function MomoQuickPayButton({
  counterpartyId,
  counterpartyName,
  className,
}: MomoQuickPayButtonProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unpaidSplits, setUnpaidSplits] = useState<any[]>([]);
  const [isLoadingSplits, setIsLoadingSplits] = useState(false);
  const loadedRef = React.useRef(false);

  // Don't show if MoMo not configured
  if (!momoAPI.isConfigured()) {
    return null;
  }

  // Load unpaid splits when dialog opens (only once)
  useEffect(() => {
    if (dialogOpen && identity?.id && !loadedRef.current) {
      loadedRef.current = true;
      loadUnpaidSplits();
    }

    // Reset when dialog closes
    if (!dialogOpen) {
      loadedRef.current = false;
    }
  }, [dialogOpen, identity?.id]);

  const loadUnpaidSplits = async () => {
    if (!identity?.id) return;

    setIsLoadingSplits(true);
    try {
      // Get all expenses where current user owes the counterparty
      const { data: expenses, error: expensesError } = await supabaseClient
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          currency,
          expense_date,
          paid_by_user_id
        `)
        .eq('paid_by_user_id', counterpartyId);

      if (expensesError) throw expensesError;

      if (!expenses || expenses.length === 0) {
        setUnpaidSplits([]);
        return;
      }

      // Get splits for these expenses where current user owes and not settled
      const expenseIds = expenses.map(e => e.id);
      const { data: splits, error: splitsError } = await supabaseClient
        .from('expense_splits')
        .select('*')
        .in('expense_id', expenseIds)
        .eq('user_id', identity.id)
        .eq('is_settled', false);

      if (splitsError) throw splitsError;

      // Combine with expense details
      const enrichedSplits = (splits || []).map(split => {
        const expense = expenses.find(e => e.id === split.expense_id);
        return {
          ...split,
          expense_description: expense?.description,
          expense_date: expense?.expense_date,
        };
      });

      setUnpaidSplits(enrichedSplits);
    } catch (error) {
      console.error('Error loading unpaid splits:', error);
    } finally {
      setIsLoadingSplits(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          tap();
          setDialogOpen(true);
        }}
        className={cn(
          "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white",
          className
        )}
      >
        <BanknoteIcon className="h-4 w-4 mr-2" />
        {t('payments.payViaMomo', 'Pay via MoMo')}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BanknoteIcon className="h-5 w-5 text-pink-600" />
              {t('payments.momo.payTo', 'Pay to {{name}}', { name: counterpartyName })}
            </DialogTitle>
            <DialogDescription>
              {t('payments.momo.selectExpense', 'Select which expense to pay via MoMo')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {isLoadingSplits ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : unpaidSplits.length === 0 ? (
              <Alert>
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>
                  {t('payments.momo.noUnpaidExpenses', 'No unpaid expenses found')}
                </AlertDescription>
              </Alert>
            ) : (
              unpaidSplits.map((split) => (
                <div key={split.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{split.expense_description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(split.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive" className="ml-2">
                      {formatNumber(split.computed_amount)} VND
                    </Badge>
                  </div>

                  <MomoPaymentButton
                    split={split}
                    className="w-full"
                    onPaymentComplete={() => {
                      loadUnpaidSplits();
                      // Optionally close dialog after payment
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
