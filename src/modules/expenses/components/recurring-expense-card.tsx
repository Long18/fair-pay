import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import {
  RecurringExpense,
  getFrequencyDescription,
  getRecurringExpenseStatus,
} from '../types/recurring';
import { CategoryIcon } from './category-icon';
import { PrepaidStatusBadge } from './prepaid-status-badge';
import { PrepaidPaymentDialog } from './prepaid-payment-dialog';
import { PrepaidPaymentHistory } from './prepaid-payment-history';
import { useState, useMemo } from 'react';
import { useUpdateRecurringExpense, useDeleteRecurringExpense } from '../hooks/use-recurring-expenses';
import { useNotification, useGetIdentity, useList } from '@refinedev/core';
import { formatNumber } from '@/lib/locale-utils';
import { useTranslation } from 'react-i18next';
import { getPrepaidCoverageStatus, formatPrepaidCoverage } from '../utils/prepaid-calculations';

import {
  MoreVerticalIcon,
  RepeatIcon,
  PauseIcon,
  PlayIcon,
  Trash2Icon,
  CalendarIcon,
  BanknoteIcon,
  ChevronDownIcon,
  PencilIcon,
} from "@/components/ui/icons";

interface RecurringExpenseCardProps {
  recurring: RecurringExpense;
  onUpdate?: () => void;
  onEdit?: (recurring: RecurringExpense) => void;
}

export function RecurringExpenseCard({ recurring, onUpdate, onEdit }: RecurringExpenseCardProps) {
  const { t, i18n } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrepaidDialog, setShowPrepaidDialog] = useState(false);
  const [showPrepaidHistory, setShowPrepaidHistory] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { pauseRecurring, resumeRecurring } = useUpdateRecurringExpense();
  const { deleteRecurring } = useDeleteRecurringExpense();
  const { open: notify } = useNotification();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const currentUserId = identity?.id || '';

  const status = getRecurringExpenseStatus(recurring);
  const template = recurring.template_expense || recurring.expenses;
  const dateLocale = i18n.language === 'vi' ? vi : enUS;
  const language = i18n.language === 'vi' ? 'vi' : 'en';

  // Get prepaid coverage info
  const prepaidCoverageInfo = getPrepaidCoverageStatus(recurring);
  const hasPrepaidCoverage = prepaidCoverageInfo.status !== 'none';

  // Fetch members based on context (group or friendship)
  const groupId = template?.group_id;
  const friendshipId = template?.friendship_id;

  // Fetch group members if group context
  const { query: groupMembersQuery } = useList({
    resource: 'group_members',
    filters: groupId ? [{ field: 'group_id', operator: 'eq', value: groupId }] : [],
    meta: {
      select: '*, profiles:user_id(id, full_name)',
    },
    pagination: { mode: 'off' },
    queryOptions: {
      enabled: !!groupId,
    },
  });

  // Fetch friendship members if friendship context
  const { query: friendshipQuery } = useList({
    resource: 'friendships',
    filters: friendshipId ? [{ field: 'id', operator: 'eq', value: friendshipId }] : [],
    meta: {
      select: '*, user:user_id(id, full_name), friend:friend_id(id, full_name)',
    },
    pagination: { mode: 'off' },
    queryOptions: {
      enabled: !!friendshipId,
    },
  });

  // Build members list
  const members = useMemo(() => {
    if (groupId && groupMembersQuery.data?.data) {
      return groupMembersQuery.data.data.map((gm: any) => ({
        id: gm.profiles?.id || gm.user_id,
        full_name: gm.profiles?.full_name || 'Unknown',
      }));
    }
    if (friendshipId && friendshipQuery.data?.data?.[0]) {
      const friendship = friendshipQuery.data.data[0] as any;
      return [
        { id: friendship.user?.id || friendship.user_id, full_name: friendship.user?.full_name || 'Unknown' },
        { id: friendship.friend?.id || friendship.friend_id, full_name: friendship.friend?.full_name || 'Unknown' },
      ];
    }
    // Fallback: just the template payer
    if (template?.paid_by_user_id) {
      return [{ id: template.paid_by_user_id, full_name: 'Payer' }];
    }
    return [];
  }, [groupId, friendshipId, groupMembersQuery.data, friendshipQuery.data, template]);

  const handlePauseResume = async () => {
    try {
      setIsUpdating(true);
      if (recurring.is_active) {
        await pauseRecurring(recurring.id);
        notify?.({
          type: 'success',
          message: t('recurring.pausedSuccess'),
        });
      } else {
        await resumeRecurring(recurring.id);
        notify?.({
          type: 'success',
          message: t('recurring.resumedSuccess'),
        });
      }
      onUpdate?.();
    } catch (error) {
      notify?.({
        type: 'error',
        message: t('recurring.errorOccurred'),
        description: error instanceof Error ? error.message : t('recurring.cannotUpdate'),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteRecurring(recurring.id);
      notify?.({
        type: 'success',
        message: t('recurring.deletedSuccess'),
      });
      setShowDeleteDialog(false);
      onUpdate?.();
    } catch (error) {
      notify?.({
        type: 'error',
        message: t('recurring.errorOccurred'),
        description: error instanceof Error ? error.message : t('recurring.cannotDelete'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrepaidSuccess = () => {
    setShowPrepaidDialog(false);
    onUpdate?.();
  };

  if (!template) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RepeatIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{template.description}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {template.category && (
                    <CategoryIcon category={template.category} size="sm" />
                  )}
                  <Badge variant={recurring.is_active ? 'default' : 'secondary'}>
                    {recurring.is_active ? t('recurring.active') : t('recurring.paused')}
                  </Badge>
                  {/* Prepaid Status Badge - Requirements 5.1, 5.3, 5.4, 5.5 */}
                  {hasPrepaidCoverage && (
                    <PrepaidStatusBadge coverageInfo={prepaidCoverageInfo} />
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Pay Upfront action - Requirements 5.1 */}
                {recurring.is_active && (
                  <>
                    <DropdownMenuItem onClick={() => setShowPrepaidDialog(true)}>
                      <BanknoteIcon className="mr-2 h-4 w-4" />
                      {t('recurring.prepaid.payUpfront', 'Pay upfront')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(recurring)}>
                    <PencilIcon className="mr-2 h-4 w-4" />
                    {t('recurring.edit', 'Edit')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handlePauseResume}
                  disabled={isUpdating}
                >
                  {recurring.is_active ? (
                    <>
                      <PauseIcon className="mr-2 h-4 w-4" />
                      {t('recurring.pause')}
                    </>
                  ) : (
                    <>
                      <PlayIcon className="mr-2 h-4 w-4" />
                      {t('recurring.resume')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  {t('recurring.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatNumber(template.amount)} {template.currency}
            </span>
            <Badge variant="outline">
              {getFrequencyDescription(recurring.frequency, recurring.interval)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">{t('recurring.nextCreation')}</p>
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <p className="font-medium">
                  {format(new Date(recurring.next_occurrence), 'PPP', { locale: dateLocale })}
                </p>
              </div>
              {status.days_until_next >= 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('recurring.daysRemaining', { days: status.days_until_next })}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground">
                {recurring.end_date ? t('recurring.endsOn') : t('recurring.noLimit')}
              </p>
              {recurring.end_date && (
                <p className="font-medium">
                  {format(new Date(recurring.end_date), 'PPP', { locale: dateLocale })}
                </p>
              )}
            </div>
          </div>

          {/* Prepaid Coverage Info - Requirements 5.2 */}
          {hasPrepaidCoverage && recurring.prepaid_until && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {formatPrepaidCoverage(recurring.prepaid_until, language)}
              </p>
            </div>
          )}

          {/* Prepaid Payment History Section - Requirements 6.2 */}
          {hasPrepaidCoverage && (
            <Collapsible open={showPrepaidHistory} onOpenChange={setShowPrepaidHistory}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between mt-2 text-muted-foreground hover:text-foreground"
                >
                  <span className="text-sm">
                    {t('recurring.prepaid.paymentHistory', 'Payment History')}
                  </span>
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showPrepaidHistory ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <PrepaidPaymentHistory
                  recurringExpenseId={recurring.id}
                  currency={template?.currency || 'VND'}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recurring.deleteRecurringTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('recurring.deleteRecurringDescription')}
              <br />
              <br />
              <strong>{t('recurring.deleteRecurringNote')}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t('recurring.deleting') : t('recurring.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prepaid Payment Dialog - Requirements 1.1, 4.4 */}
      <PrepaidPaymentDialog
        recurring={recurring}
        members={members}
        currentUserId={currentUserId}
        open={showPrepaidDialog}
        onOpenChange={setShowPrepaidDialog}
        onSuccess={handlePrepaidSuccess}
      />
    </>
  );
}
