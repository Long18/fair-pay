import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2Icon, BanknoteIcon } from '@/components/ui/icons';
import { useHaptics } from '@/hooks/use-haptics';
import { formatNumber } from '@/lib/locale-utils';
import { useMemberPrepaid } from '../hooks/use-member-prepaid';
import { useMemberPrepaidInfo } from '../hooks/use-member-prepaid-info';
import type { MemberPrepaidInput } from '../types/prepaid';

interface Member {
  id: string;
  full_name: string;
}

interface MultiMemberPrepaidDialogProps {
  recurringExpenseId: string;
  members: Member[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MultiMemberPrepaidDialog({
  recurringExpenseId,
  members,
  currentUserId,
  open,
  onOpenChange,
  onSuccess,
}: MultiMemberPrepaidDialogProps) {
  const { t } = useTranslation();
  const { tap, success } = useHaptics();
  const { recordMultiMember, isRecording } = useMemberPrepaid();
  const { data: prepaidInfo, isLoading: isLoadingPrepaidInfo } = useMemberPrepaidInfo(recurringExpenseId);

  const [selectedMembers, setSelectedMembers] = useState<Map<string, number>>(
    new Map()
  );
  const [paidBy, setPaidBy] = useState<string>(currentUserId);

  // Build member shares map
  const memberShares = useMemo(() => {
    const map = new Map<string, number>();
    prepaidInfo?.forEach((info) => {
      map.set(info.user_id, info.monthly_share);
    });
    return map;
  }, [prepaidInfo]);

  const currency = prepaidInfo?.[0]?.currency || 'VND';

  // Calculate total amount
  const totalAmount = useMemo(() => {
    let total = 0;
    selectedMembers.forEach((months, userId) => {
      const monthlyShare = memberShares.get(userId) || 0;
      total += monthlyShare * months;
    });
    return total;
  }, [selectedMembers, memberShares]);

  const handleMemberToggle = (userId: string, checked: boolean) => {
    tap();
    const newSelected = new Map(selectedMembers);
    if (checked) {
      newSelected.set(userId, 1);
    } else {
      newSelected.delete(userId);
    }
    setSelectedMembers(newSelected);
  };

  const handleMonthsChange = (userId: string, value: string) => {
    const newSelected = new Map(selectedMembers);

    // Allow empty string (while user is typing) or valid numbers
    if (value === '') {
      newSelected.set(userId, 1); // Default to 1 when cleared
      setSelectedMembers(newSelected);
      return;
    }

    const months = parseInt(value, 10);
    if (isNaN(months)) return; // Only block non-numeric input

    // Clamp between 1 and 24
    const clampedMonths = Math.max(1, Math.min(months, 24));
    newSelected.set(userId, clampedMonths);
    setSelectedMembers(newSelected);
  };

  const handleSubmit = async () => {
    const memberMonths: MemberPrepaidInput[] = Array.from(
      selectedMembers.entries()
    ).map(([user_id, months]) => ({
      user_id,
      months,
    }));

    const result = await recordMultiMember({
      recurringExpenseId,
      memberMonths,
      paidByUserId: paidBy,
    });

    if (result.success) {
      success();
      setSelectedMembers(new Map());
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    tap();
    setSelectedMembers(new Map());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('prepaid.payUpfrontMultiple', 'Pay upfront for members')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'prepaid.selectMembersDescription',
              'Select members and specify months to prepay. Amount is calculated from each member\'s monthly share.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {isLoadingPrepaidInfo && (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('prepaid.loadingMemberInfo', 'Loading member information...')}
              </span>
            </div>
          )}

          {/* Member Selection */}
          {!isLoadingPrepaidInfo && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t('prepaid.selectMembers', 'Select members')}
              </Label>

              {members.map((member) => {
              const monthlyShare = memberShares.get(member.id) || 0;
              const months = selectedMembers.get(member.id) || 1;
              const isSelected = selectedMembers.has(member.id);
              const amount = monthlyShare * months;

              return (
                <div
                  key={member.id}
                  className="rounded-lg border p-3 space-y-2 bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleMemberToggle(member.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`member-${member.id}`}
                      className="font-medium cursor-pointer flex-1"
                    >
                      {member.full_name}
                      {member.id === currentUserId && ` (${t('common.you', 'You')})`}
                    </Label>
                  </div>

                  {isSelected && (
                    <div className="ml-6 grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`months-${member.id}`} className="text-xs">
                          {t('prepaid.months', 'Months')}
                        </Label>
                        <Input
                          id={`months-${member.id}`}
                          type="number"
                          min={1}
                          max={24}
                          value={months}
                          onChange={(e) =>
                            handleMonthsChange(member.id, e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t('prepaid.amount', 'Amount')}
                        </Label>
                        <div className="h-9 px-3 border rounded-lg flex items-center bg-muted/50">
                          <span className="font-semibold text-sm">
                            {formatNumber(amount)} {currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="ml-6 text-xs text-muted-foreground">
                    {t(
                      'prepaid.monthlyShareInfo',
                      'Monthly share: {{amount}} {{currency}}',
                      {
                        amount: formatNumber(monthlyShare),
                        currency,
                      }
                    )}
                  </p>
                </div>
              );
            })}
            </div>
          )}

          {/* Paid By Selection */}
          {!isLoadingPrepaidInfo && (
          <div className="space-y-2">
            <Label htmlFor="paid-by" className="text-base font-semibold">
              {t('prepaid.paidBy', 'Paid by')}
            </Label>
            <select
              id="paid-by"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full h-10 px-3 border border-input rounded-lg bg-background"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                  {member.id === currentUserId && ` (${t('common.you', 'You')})`}
                </option>
              ))}
            </select>
          </div>
          )}

          {/* Total Amount Summary */}
          {!isLoadingPrepaidInfo && selectedMembers.size > 0 && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary">
                    {t('prepaid.totalAmount', 'Total amount')}
                  </span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatNumber(totalAmount)} {currency}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  'prepaid.membersSelected',
                  '{{count}} member(s) selected',
                  { count: selectedMembers.size }
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isRecording}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isRecording || selectedMembers.size === 0 || !paidBy}
          >
            {isRecording ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading', 'Loading...')}
              </>
            ) : (
              t('prepaid.recordPayment', 'Record payment')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
