import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RecurringExpense } from '../types/recurring';
import { PrepaidPaymentForm } from './prepaid-payment-form';
import { useRecordPrepaidPayment } from '../hooks/use-record-prepaid-payment';

interface Member {
  id: string;
  full_name: string;
}

interface PrepaidPaymentDialogProps {
  recurring: RecurringExpense;
  members: Member[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * PrepaidPaymentDialog - Modal dialog for recording prepaid payments
 * 
 * Requirements: 1.1, 1.4
 * - Modal dialog containing PrepaidPaymentForm
 * - Show success/error feedback
 * - Close on successful payment
 */
export function PrepaidPaymentDialog({
  recurring,
  members,
  currentUserId,
  open,
  onOpenChange,
  onSuccess,
}: PrepaidPaymentDialogProps) {
  const { t } = useTranslation();
  const { recordPayment, isRecording } = useRecordPrepaidPayment();

  const template = recurring.template_expense || recurring.expenses;

  const handleSubmit = async (periodsCount: number, amount: number, paidByUserId: string) => {
    const result = await recordPayment({
      recurringExpenseId: recurring.id,
      periodsCount,
      amount,
      paidByUserId,
    });

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('recurring.prepaid.payUpfront', 'Pay upfront')}
          </DialogTitle>
          <DialogDescription>
            {template?.description || t('recurring.prepaid.recordPayment', 'Record prepaid payment')}
          </DialogDescription>
        </DialogHeader>

        <PrepaidPaymentForm
          recurring={recurring}
          members={members}
          currentUserId={currentUserId}
          onSubmit={handleSubmit}
          isSubmitting={isRecording}
        />
      </DialogContent>
    </Dialog>
  );
}
