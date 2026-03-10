import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SwipeableCard } from '@/components/ui/swipeable-card';
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
import { MemberPrepaidBalanceList } from './member-prepaid-balance-list';
import { MultiMemberPrepaidDialog } from './multi-member-prepaid-dialog';
import { useState, useMemo } from 'react';
import { useUpdateRecurringExpense, useDeleteRecurringExpense } from '../hooks/use-recurring-expenses';
import { useValidateRunCycle, ValidateRunCycleResult } from '../hooks/use-validate-run-cycle';
import { useNotification, useGetIdentity, useList } from '@refinedev/core';
import { formatNumber } from '@/lib/locale-utils';
import { useTranslation } from 'react-i18next';
import { getPrepaidCoverageStatus, formatPrepaidCoverage } from '../utils/prepaid-calculations';
import { useMemberPrepaidInfo } from '../hooks/use-member-prepaid-info';

import {
  MoreVerticalIcon,
  RepeatIcon,
  PauseIcon,
  PlayIcon,
  Trash2Icon,
  CalendarIcon as CalendarIconBase,
  BanknoteIcon,
  ChevronDownIcon,
  PencilIcon,
  RefreshCwIcon,
  Loader2Icon,
  CheckIcon,
} from "@/components/ui/icons";
import { CalendarExportMenu } from "@/components/calendar/calendar-export-menu";
import { useHaptics } from '@/hooks/use-haptics';

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
  const [cycleResult, setCycleResult] = useState<ValidateRunCycleResult | null>(null);
  const { pauseRecurring, resumeRecurring } = useUpdateRecurringExpense();
  const { deleteRecurring } = useDeleteRecurringExpense();
  const { validateAndRun, isRunning } = useValidateRunCycle();
  const { tap, success, warning } = useHaptics();
  const { open: notify } = useNotification();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const currentUserId = identity?.id || '';

  const status = getRecurringExpenseStatus(recurring);
  const template = recurring.template_expense || recurring.expenses;
  const dateLocale = i18n.language === 'vi' ? vi : enUS;
  const language = i18n.language === 'vi' ? 'vi' : 'en';

  // Cycle validation state
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextCycleDate = new Date(recurring.next_occurrence);
  nextCycleDate.setHours(0, 0, 0, 0);
  const isCycleDue = nextCycleDate <= today;
  const cyclePeriodLabel = format(nextCycleDate, 'MMM yyyy', { locale: dateLocale });

  const handleValidateRunCycle = async () => {
    tap();
    const result = await validateAndRun(recurring);
    setCycleResult(result);
    if (result.success) {
      success();
      onUpdate?.();
    }
  };

  // Get prepaid coverage info (legacy)
  const prepaidCoverageInfo = getPrepaidCoverageStatus(recurring);
  const hasPrepaidCoverage = prepaidCoverageInfo.status !== 'none';

  // Get per-member prepaid info (new system)
  const { data: memberPrepaidInfo } = useMemberPrepaidInfo(recurring.id);
  const membersWithPrepaid = memberPrepaidInfo?.filter(m => m.balance_amount > 0) || [];

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
    tap();
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
    warning();
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

  const swipeActions = {
    right: [
      {
        label: recurring.is_active ? t('recurring.pause') : t('recurring.resume'),
        icon: recurring.is_active ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />,
        onClick: handlePauseResume,
        variant: "default" as const,
      },
      {
        label: t('recurring.delete'),
        icon: <Trash2Icon className="h-5 w-5" />,
        onClick: () => setShowDeleteDialog(true),
        variant: "destructive" as const,
      },
    ],
  };

  return (
    <>
      <SwipeableCard rightActions={swipeActions.right} className="md:[&>*:first-child]:pointer-events-auto">
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
                  {recurring.is_active && (
                    <Badge variant="outline" className="border-sky-200 text-sky-700">
                      {t('recurring.autoRunBadge', 'Auto 00:05 GMT+7')}
                    </Badge>
                  )}
                  {/* Prepaid Status Badge - Legacy */}
                  {hasPrepaidCoverage && (
                    <PrepaidStatusBadge coverageInfo={prepaidCoverageInfo} />
                  )}
                  {/* Per-Member Prepaid Badge */}
                  {membersWithPrepaid.length > 0 && (
                    <Badge variant="default" className="gap-1">
                      <BanknoteIcon className="h-3 w-3" />
                      {t('prepaid.membersPrepaid', '{{count}} member(s) prepaid', {
                        count: membersWithPrepaid.length
                      })}
                    </Badge>
                  )}
                  {/* Cycle execution status badge */}
                  {recurring.is_active && cycleResult?.success && (
                    <Badge
                      variant={cycleResult.alreadyExecuted ? 'secondary' : 'default'}
                      className="gap-1"
                    >
                      <CheckIcon className="h-3 w-3" />
                      {cycleResult.alreadyExecuted
                        ? t('recurring.cycle.alreadyExecutedBadge', 'Already executed')
                        : t('recurring.cycle.executedBadge', 'Executed {{period}}', { period: cyclePeriodLabel })
                      }
                    </Badge>
                  )}
                  {/* Cycle due badge - shown when overdue and not yet run */}
                  {recurring.is_active && isCycleDue && !cycleResult?.success && (
                    <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
                      <RefreshCwIcon className="h-3 w-3" />
                      {t('recurring.cycle.dueBadge', 'Cycle due')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <CalendarExportMenu expense={recurring} variant="icon" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => tap()}>
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Pay Upfront action - Requirements 5.1 */}
                {recurring.is_active && (
                  <>
                    <DropdownMenuItem onClick={() => { tap(); setShowPrepaidDialog(true); }}>
                      <BanknoteIcon className="mr-2 h-4 w-4" />
                      {t('recurring.prepaid.payUpfront', 'Pay upfront')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => { tap(); onEdit(recurring); }}>
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
                  onClick={() => { tap(); setShowDeleteDialog(true); }}
                  className="text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  {t('recurring.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

          {/* Member Splits Section */}
          {template.expense_splits && template.expense_splits.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t('recurring.memberShares', 'Member shares per occurrence')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {template.expense_splits.map((split: any) => {
                  const member = members.find(m => m.id === split.user_id);
                  return (
                    <div key={split.id} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50">
                      <span className="text-xs truncate flex-1">
                        {member?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs font-medium ml-2">
                        {formatNumber(split.computed_amount)} {template.currency}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">{t('recurring.nextCreation')}</p>
              <div className="flex items-center gap-1">
                <CalendarIconBase className="h-3 w-3" />
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

          {/* Manual fallback for the auto-run cycle */}
          {recurring.is_active && (
            <div className="pt-2 border-t">
              {cycleResult?.success && !cycleResult?.alreadyExecuted ? (
                // Successfully executed - show confirmation state
                <div className="flex items-center gap-2 text-sm text-green-700 py-1">
                  <CheckIcon className="h-4 w-4 shrink-0" />
                  <span>
                    {t('recurring.cycle.executedFor', 'Executed for {{period}}', { period: cyclePeriodLabel })}
                  </span>
                </div>
              ) : cycleResult?.alreadyExecuted ? (
                // Already executed - show info state
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <CheckIcon className="h-4 w-4 shrink-0" />
                  <span>
                    {t('recurring.cycle.alreadyExecutedFor', 'Cycle already executed for {{period}}', { period: cyclePeriodLabel })}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full gap-2 ${
                      isCycleDue
                        ? 'border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800'
                        : 'text-muted-foreground'
                    }`}
                    onClick={handleValidateRunCycle}
                    disabled={isRunning || !isCycleDue}
                    title={
                      !isCycleDue
                        ? t('recurring.cycle.notYetDue', 'Next cycle runs on {{date}}', {
                            date: format(nextCycleDate, 'PPP', { locale: dateLocale }),
                          })
                        : undefined
                    }
                  >
                    {isRunning ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="h-4 w-4" />
                    )}
                    {isRunning
                      ? t('recurring.cycle.running', 'Running cycle...')
                      : isCycleDue
                        ? t('recurring.cycle.runNow', 'Run now')
                        : t('recurring.cycle.pendingExecution', 'Scheduled - {{date}}', {
                            date: format(nextCycleDate, 'MMM d', { locale: dateLocale }),
                          })
                    }
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'recurring.cycle.manualFallbackHint',
                      'Auto-runs daily at 00:05 GMT+7. Use this only if you need to trigger the cycle manually.'
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Legacy Prepaid Coverage Info */}
          {hasPrepaidCoverage && recurring.prepaid_until && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {formatPrepaidCoverage(recurring.prepaid_until, language)}
              </p>
            </div>
          )}

          {/* Prominent Pay Upfront Button - visible for active recurring without member prepaid */}
          {recurring.is_active && (!memberPrepaidInfo || memberPrepaidInfo.length === 0) && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                onClick={() => { tap(); setShowPrepaidDialog(true); }}
              >
                <BanknoteIcon className="h-4 w-4" />
                {t('recurring.prepaid.payUpfront', 'Pay upfront')}
              </Button>
            </div>
          )}

          {/* Per-Member Prepaid Balances Section */}
          {memberPrepaidInfo && memberPrepaidInfo.length > 0 && (
            <Collapsible open={showPrepaidHistory} onOpenChange={setShowPrepaidHistory}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between mt-2 text-muted-foreground hover:text-foreground"
                  onClick={() => tap()}
                >
                  <span className="text-sm font-medium">
                    {t('prepaid.memberBalances', 'Member balances')}
                  </span>
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showPrepaidHistory ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                <MemberPrepaidBalanceList recurringExpenseId={recurring.id} />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                  onClick={() => { tap(); setShowPrepaidDialog(true); }}
                >
                  <BanknoteIcon className="mr-2 h-4 w-4" />
                  {t('prepaid.addPrepaid', 'Add prepaid for members')}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
      </SwipeableCard>

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

      {/* Legacy Prepaid Payment Dialog */}
      <PrepaidPaymentDialog
        recurring={recurring}
        members={members}
        currentUserId={currentUserId}
        open={false}
        onOpenChange={setShowPrepaidDialog}
        onSuccess={handlePrepaidSuccess}
      />

      {/* Per-Member Prepaid Dialog */}
      <MultiMemberPrepaidDialog
        recurringExpenseId={recurring.id}
        members={members}
        currentUserId={currentUserId}
        open={showPrepaidDialog}
        onOpenChange={setShowPrepaidDialog}
        onSuccess={handlePrepaidSuccess}
      />
    </>
  );
}
