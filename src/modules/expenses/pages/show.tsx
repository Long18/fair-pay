import { useState, useEffect, useMemo } from "react";
import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense, ExpenseSplit, Attachment } from "../types";
import { AttachmentList } from "../components/attachment-list";
import { ExpenseHeader } from "../components/expense-header";
import { ExpenseAmountDisplay } from "../components/expense-amount-display";
import { ExpenseSplitCard } from "../components/expense-split-card";
import { Profile } from "@/modules/profile/types";
import { Badge } from "@/components/ui/badge";
import { YourPositionCard } from "@/components/expenses/your-position-card";
import { SettleExpenseSection } from "@/components/expenses/settle-expense-section";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatNumber } from "@/lib/locale-utils";
import { supabaseClient } from "@/utility/supabaseClient";
import { useTranslation } from "react-i18next";
import { isAdmin } from "@/lib/rbac";
import { ArrowLeftIcon, CheckCircle2Icon, PlusIcon, HomeIcon, PencilIcon, RepeatIcon, CalendarIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { SettleSplitDialog } from "../components/settle-split-dialog";
import { Spinner } from "@/components/ui/spinner";
import { MarkdownComment } from "../components/markdown-comment";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import { dispatchSettlementEvent } from "@/lib/settlement-events";
import { useQuery } from "@tanstack/react-query";
import { getFrequencyDescription, RecurringExpense } from "../types/recurring";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";

export const ExpenseShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [splits, setSplits] = useState<any[]>([]);
  const [isLoadingSplits, setIsLoadingSplits] = useState(true);
  const [settlingExpense, setSettlingExpense] = useState(false);
  const [settleAllDialogOpen, setSettleAllDialogOpen] = useState(false);
  const [settlingSplitId, setSettlingSplitId] = useState<string | null>(null);
  const [settleSplitDialogOpen, setSettleSplitDialogOpen] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [settlingUserSplit, setSettlingUserSplit] = useState(false);

  const { i18n } = useTranslation();
  const dateLocale = i18n.language === 'vi' ? vi : enUS;

  // Fetch recurring expense data linked to this expense (as template)
  const { data: recurringData } = useQuery({
    queryKey: ['recurring_for_expense', id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('recurring_expenses')
        .select('*, expenses!template_expense_id(id, description, amount, currency)')
        .eq('template_expense_id', id!)
        .maybeSingle();

      if (error) {
        console.error('Error fetching recurring data:', error);
        return null;
      }
      return data as (RecurringExpense & { expenses?: any }) | null;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const { query: expenseQuery } = useOne<Expense>({
    resource: "expenses",
    id: id!,
    meta: {
      select: "*, profiles!paid_by_user_id(id, full_name, avatar_url)",
    },
  });

  const refetchExpense = () => {
    expenseQuery.refetch();
  };

  // Fetch splits using RPC function to bypass RLS for public viewing
  useEffect(() => {
    if (!id) return;

    setIsLoadingSplits(true);
    Promise.resolve(
      supabaseClient
        .rpc("get_expense_splits_public", { p_expense_id: id })
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error("Error fetching splits:", error);
            setSplits([]);
          } else {
            // Transform data to match expected format
            const transformedSplits = (data || []).map((split: any) => ({
              id: split.id,
              expense_id: split.expense_id,
              user_id: split.user_id,
              pending_email: split.pending_email,
              split_method: split.split_method,
              split_value: split.split_value,
              computed_amount: split.computed_amount,
              is_settled: split.is_settled,
              settled_amount: split.settled_amount,
              settled_at: split.settled_at,
              created_at: split.created_at,
              profiles: {
                id: split.user_id,
                full_name: split.full_name || split.pending_email,
                avatar_url: split.avatar_url,
              },
            }));
            setSplits(transformedSplits);
          }
        })
    ).finally(() => setIsLoadingSplits(false));
  }, [id]);

  const { query: attachmentsQuery } = useList<Attachment>({
    resource: "attachments",
    filters: [
      {
        field: "expense_id",
        operator: "eq",
        value: id,
      },
    ],
    meta: {
      select: "*, uploaded_by",
    },
    queryOptions: {
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
    },
  });

  const deleteMutation = useDelete();

  const { data: expenseData, isLoading: isLoadingExpense } = expenseQuery;
  const { data: attachmentsData } = attachmentsQuery;

  const expense: any = expenseData?.data;
  const attachments: Attachment[] = attachmentsData?.data || [];
  const [displayAttachments, setDisplayAttachments] = useState<Attachment[]>(attachments);

  const canEdit = expense?.created_by === identity?.id;
  const isPayer = expense?.paid_by_user_id === identity?.id;
  const isPaid = expense?.is_payment === true;

  // Detect loan pattern: friend context + exactly 2 splits + one split has 0 amount
  const isLoan = useMemo(() => {
    if (!expense || expense.context_type !== 'friend' || splits.length !== 2) return false;
    const payerSplit = splits.find((s: any) => s.user_id === expense.paid_by_user_id);
    const borrowerSplit = splits.find((s: any) => s.user_id !== expense.paid_by_user_id);
    if (!payerSplit || !borrowerSplit) return false;
    // Loan pattern: payer's computed_amount is 0 (or near 0), borrower has full amount
    return payerSplit.computed_amount === 0 && Math.abs(borrowerSplit.computed_amount - expense.amount) < 1;
  }, [expense, splits]);

  const borrowerName = useMemo(() => {
    if (!isLoan || !expense) return undefined;
    const borrowerSplit = splits.find((s: any) => s.user_id !== expense.paid_by_user_id);
    return borrowerSplit?.profiles?.full_name || undefined;
  }, [isLoan, expense, splits]);

  // Calculate user position for YourPositionCard
  const userSplit = splits.find(s => s.user_id === identity?.id);
  const myShare = userSplit?.computed_amount || 0;
  const iPaid = isPayer ? expense?.amount || 0 : 0;
  const userIOwes = myShare > iPaid ? myShare - iPaid : 0;
  const userIsOwed = iPaid > myShare ? iPaid - myShare : 0;
  const netPosition = userIsOwed - userIOwes;
  const payerName = expense?.profiles?.full_name || "Unknown";

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const adminStatus = await isAdmin();
        setUserIsAdmin(adminStatus);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setUserIsAdmin(false);
      }
    };

    if (identity?.id) {
      checkAdminStatus();
    }
  }, [identity?.id]);

  // Handle settle entire expense
  const handleSettleExpense = async () => {
    if (!expense?.id) return;

    setSettlingExpense(true);
    try {
      const { data, error } = await supabaseClient.rpc('settle_all_splits', {
        p_expense_id: expense.id,
      });

      if (error) throw error;

      // Extract summary from response
      const splitsUpdated = data?.splits_updated || 0;
      const alreadyPaid = data?.already_paid || 0;
      const totalAmount = data?.total_amount || 0;
      const currency = data?.currency || expense.currency;

      toast.success(
        t('expenses.settleAllSuccess', {
          splitsUpdated,
          alreadyPaid,
          defaultValue: `Settled ${splitsUpdated} of ${splitsUpdated + alreadyPaid} splits. ${alreadyPaid} already paid.`,
        })
      );

      refetchExpense();
      // Refetch splits to update settlement status
      if (id) {
        setIsLoadingSplits(true);
        const { data: splitsData } = await supabaseClient.rpc("get_expense_splits_public", { p_expense_id: id });
        if (splitsData) {
          const transformedSplits = splitsData.map((split: any) => ({
            id: split.id,
            expense_id: split.expense_id,
            user_id: split.user_id,
            split_method: split.split_method,
            split_value: split.split_value,
            computed_amount: split.computed_amount,
            is_settled: split.is_settled,
            settled_amount: split.settled_amount,
            settled_at: split.settled_at,
            created_at: split.created_at,
            profiles: {
                id: split.user_id,
                full_name: split.full_name,
                avatar_url: split.avatar_url,
              },
          }));
          setSplits(transformedSplits);
        }
        setIsLoadingSplits(false);
      }
      setSettleAllDialogOpen(false);
      dispatchSettlementEvent();
    } catch (error: any) {
      console.error('Error settling expense:', error);
      toast.error(t('expenses.settleError', {
        defaultValue: `Failed to settle: ${error.message}`,
      }));
    } finally {
      setSettlingExpense(false);
    }
  };

  // Handle settle individual split
  const handleSettleSplit = async (amount: number) => {
    if (!selectedSplit) return;

    setSettlingSplitId(selectedSplit.id);
    try {
      const { data, error } = await supabaseClient.rpc('settle_split', {
        p_split_id: selectedSplit.id,
        p_amount: amount,
      });

      if (error) throw error;

      const isPartial = amount < selectedSplit.computed_amount;
      toast.success(
        isPartial
          ? t('expenses.partialSettleSuccess', {
              userName: selectedSplit.profiles?.full_name,
              amount: formatNumber(amount),
              defaultValue: `Partial payment of ${formatNumber(amount)} ${expense.currency} from ${selectedSplit.profiles?.full_name} marked as received`,
            })
          : t('expenses.splitSettleSuccess', {
              userName: selectedSplit.profiles?.full_name,
              defaultValue: `Payment from ${selectedSplit.profiles?.full_name} marked as received`,
            })
      );

      // Refetch splits
      if (id) {
        setIsLoadingSplits(true);
        const { data: splitsData } = await supabaseClient.rpc("get_expense_splits_public", { p_expense_id: id });
        if (splitsData) {
          const transformedSplits = splitsData.map((split: any) => ({
            id: split.id,
            expense_id: split.expense_id,
            user_id: split.user_id,
            split_method: split.split_method,
            split_value: split.split_value,
            computed_amount: split.computed_amount,
            is_settled: split.is_settled,
            settled_amount: split.settled_amount,
            settled_at: split.settled_at,
            created_at: split.created_at,
            profiles: {
                id: split.user_id,
                full_name: split.full_name,
                avatar_url: split.avatar_url,
              },
          }));
          setSplits(transformedSplits);
        }
        setIsLoadingSplits(false);
      }
      setSettleSplitDialogOpen(false);
      setSelectedSplit(null);
      dispatchSettlementEvent();
    } catch (error: any) {
      console.error('Error settling split:', error);
      toast.error(t('expenses.splitSettleError', {
        defaultValue: `Failed to settle: ${error.message}`,
      }));
    } finally {
      setSettlingSplitId(null);
    }
  };

  // Open settle dialog for a split
  const openSettleDialog = (split: any) => {
    setSelectedSplit(split);
    setSettleSplitDialogOpen(true);
  };

  // Handle settle user's own split
  const handleSettleUserSplit = async () => {
    if (!userSplit) return;

    setSettlingUserSplit(true);
    try {
      const { error } = await supabaseClient
        .from('expense_splits')
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          settled_amount: userSplit.computed_amount,
        })
        .eq('id', userSplit.id);

      if (error) throw error;

      toast.success(
        t('expenses.settlementMarked', {
          defaultValue: 'Your payment has been marked as settled',
        })
      );

      // Refetch splits
      if (id) {
        setIsLoadingSplits(true);
        const { data: splitsData } = await supabaseClient.rpc("get_expense_splits_public", { p_expense_id: id });
        if (splitsData) {
          const transformedSplits = splitsData.map((split: any) => ({
            id: split.id,
            expense_id: split.expense_id,
            user_id: split.user_id,
            split_method: split.split_method,
            split_value: split.split_value,
            computed_amount: split.computed_amount,
            is_settled: split.is_settled,
            settled_amount: split.settled_amount,
            settled_at: split.settled_at,
            created_at: split.created_at,
            profiles: {
                id: split.user_id,
                full_name: split.full_name,
                avatar_url: split.avatar_url,
              },
          }));
          setSplits(transformedSplits);
        }
        setIsLoadingSplits(false);
      }
    } catch (error: any) {
      console.error('Error settling split:', error);
      toast.error(t('expenses.settleError', {
        defaultValue: `Failed to settle: ${error.message}`,
      }));
    } finally {
      setSettlingUserSplit(false);
    }
  };

  // Sync displayAttachments with fetched attachments
  useEffect(() => {
    setDisplayAttachments(attachments);
  }, [attachments]);

  // Handle loading state similar to dashboard
  useEffect(() => {
    if (!isLoadingExpense && !isLoadingSplits) {
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoadingExpense, isLoadingSplits]);

  const handleAttachmentDelete = (attachmentId: string) => {
    setDisplayAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const handleDelete = () => {
    if (!expense?.id) return;

    deleteMutation.mutate(
      {
        resource: "expenses",
        id: expense.id,
      },
      {
        onSuccess: () => {
          toast.success("Expense deleted successfully");
          // Navigate back to appropriate context
          if (expense.group_id) {
            go({ to: `/groups/show/${expense.group_id}` });
          } else if (expense.friendship_id) {
            go({ to: `/friends/${expense.friendship_id}` });
          } else {
            go({ to: `/` });
          }
        },
        onError: (error) => {
          toast.error(`Failed to delete expense: ${error.message}`);
        },
      }
    );
  };

  // Skeleton loading state
  if (isLoadingExpense || isLoadingSplits || !expense || loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 pb-20 md:pb-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-4 md:mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                go({ to: "/dashboard" });
              }}
            >
              <HomeIcon className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (expense.group_id) {
                  go({ to: `/groups/show/${expense.group_id}` });
                } else if (expense.friendship_id) {
                  go({ to: `/friends/${expense.friendship_id}` });
                }
              }}
            >
              {expense.group_id ? t('common.group', 'Group') : t('common.friend', 'Friend')}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-muted-foreground">
              {expense.description}
            </span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4 md:space-y-6"
      >
        {/* Your Position Card - NEW */}
        {identity?.id && userSplit && (
          <YourPositionCard
            iOwe={userIOwes}
            iAmOwed={userIsOwed}
            netPosition={netPosition}
            currency={expense.currency}
            isSettled={userSplit.is_settled || false}
          />
        )}

        {/* Main Expense Card */}
        <Card className="rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-0">
            {/* Delete Confirmation Dialog */}
            <AlertDialog>
              <ExpenseHeader
                expense={expense}
                canEdit={canEdit}
                onEdit={() => go({ to: `/expenses/edit/${expense.id}` })}
                onDelete={() => {
                  const dialog = document.querySelector('[role="alertdialog"]');
                  if (!dialog) {
                    // Trigger the alert dialog programmatically
                    const trigger = document.querySelector('[data-delete-trigger]') as HTMLElement;
                    trigger?.click();
                  }
                }}
              />
              <AlertDialogTrigger asChild>
                <button data-delete-trigger className="hidden" />
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('expenses.deleteTitle', 'Delete Expense?')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('expenses.deleteDescription', 'This action cannot be undone. This will permanently delete this expense and all associated splits.')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t('common.delete', 'Delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 pt-6">
            <ExpenseAmountDisplay expense={expense} isLoan={isLoan} borrowerName={borrowerName} />
          </CardContent>
        </Card>

        {/* Recurring Expense Info Card */}
        {recurringData && (
          <Card className="rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow duration-200 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-100">
                    <RepeatIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  {t('recurring.scheduleInfo', 'Recurring Schedule')}
                </CardTitle>
                <Badge
                  variant={recurringData.is_active ? 'default' : 'secondary'}
                  className={recurringData.is_active
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : ''
                  }
                >
                  {recurringData.is_active ? (
                    <><PlayIcon className="h-3 w-3 mr-1" />{t('recurring.active', 'Active')}</>
                  ) : (
                    <><PauseIcon className="h-3 w-3 mr-1" />{t('recurring.paused', 'Paused')}</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t('recurring.frequency', 'Frequency')}</p>
                  <p className="font-medium">
                    {getFrequencyDescription(recurringData.frequency as any, recurringData.interval)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t('recurring.nextCreation', 'Next creation')}</p>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="font-medium">
                      {format(new Date(recurringData.next_occurrence), 'PPP', { locale: dateLocale })}
                    </p>
                  </div>
                </div>
                {recurringData.end_date && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">{t('recurring.endsOn', 'Ends on')}</p>
                    <p className="font-medium">
                      {format(new Date(recurringData.end_date), 'PPP', { locale: dateLocale })}
                    </p>
                  </div>
                )}
                {recurringData.prepaid_until && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">{t('recurring.prepaid.prepaidUntil', 'Prepaid until')}</p>
                    <p className="font-medium text-green-600">
                      {format(new Date(recurringData.prepaid_until), 'PPP', { locale: dateLocale })}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                {t('recurring.templateNote', 'This expense is a recurring template. New expenses are auto-created on schedule.')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Split Details Card */}
        <Card className="rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                {t('expenses.splitDetails')}
                <Badge variant="secondary" className="ml-1">
                  {splits.length}
                </Badge>
              </CardTitle>
              {((isPayer || userIsAdmin) && !isPaid && splits.some(s => !s.is_settled && s.user_id !== identity?.id)) && (
                <AlertDialog open={settleAllDialogOpen} onOpenChange={setSettleAllDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto shadow-sm"
                    >
                      <CheckCircle2Icon className="h-4 w-4 mr-2" />
                      {t('expenses.settleAll', 'Settle All')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('expenses.settleAllTitle', 'Settle All Unpaid Splits?')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {(() => {
                          const unpaidCount = splits.filter(s => !s.is_settled || (s.settled_amount < s.computed_amount)).length;
                          const alreadyPaidCount = splits.filter(s => s.is_settled && s.settled_amount >= s.computed_amount).length;
                          return t('expenses.settleAllDescription', {
                            unpaidCount,
                            alreadyPaidCount,
                            defaultValue: `Mark ${unpaidCount} unpaid split${unpaidCount !== 1 ? 's' : ''} as settled? ${alreadyPaidCount} split${alreadyPaidCount !== 1 ? 's are' : ' is'} already paid and will remain unchanged.`,
                          });
                        })()}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={settlingExpense}>
                        {t('common.cancel', 'Cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSettleExpense}
                        disabled={settlingExpense}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {settlingExpense ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            {t('expenses.settling', 'Settling...')}
                          </>
                        ) : (
                          <>
                            <CheckCircle2Icon className="h-4 w-4 mr-2" />
                            {t('expenses.confirmSettle', 'Confirm')}
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {splits
                  .slice() // Create a copy to avoid mutating original array
                  .sort((a: any, b: any) => {
                    // Sort order: unpaid first, then partially paid, then fully paid
                    const aSettled = a.is_settled || isPaid;
                    const bSettled = b.is_settled || isPaid;
                    const aPartial = a.is_settled && a.settled_amount < a.computed_amount;
                    const bPartial = b.is_settled && b.settled_amount < b.computed_amount;

                    // Unpaid (not settled) = 0
                    // Partially paid = 1
                    // Fully paid = 2
                    const aStatus = aSettled ? (aPartial ? 1 : 2) : 0;
                    const bStatus = bSettled ? (bPartial ? 1 : 2) : 0;

                    if (aStatus !== bStatus) {
                      return aStatus - bStatus;
                    }

                    // If same status, put current user first
                    const aIsCurrentUser = a.user_id === identity?.id;
                    const bIsCurrentUser = b.user_id === identity?.id;
                    if (aIsCurrentUser && !bIsCurrentUser) return -1;
                    if (!aIsCurrentUser && bIsCurrentUser) return 1;

                    return 0;
                  })
                  .map((split: any, index: number) => {
                    const isCurrentUserSplit = split.user_id === identity?.id;
                    const isSplitSettled = split.is_settled || isPaid;
                    // Admin can settle any unsettled split (including their own when they're owed money)
                    // Payer can settle splits for others (but not their own)
                    const canSettle = userIsAdmin 
                      ? !isSplitSettled 
                      : (isPayer && !isSplitSettled && !isCurrentUserSplit);

                    return (
                      <motion.div
                        key={split.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <ExpenseSplitCard
                          split={split}
                          expense={expense}
                          isCurrentUser={isCurrentUserSplit}
                          isPayer={isPayer}
                          canSettle={canSettle}
                          isSettling={settlingSplitId === split.id}
                          isLoan={isLoan}
                          onSettle={openSettleDialog}
                          onPaymentComplete={() => {
                            refetchExpense();
                            // Reload splits
                            setIsLoadingSplits(true);
                            supabaseClient
                              .rpc("get_expense_splits_public", { p_expense_id: id })
                              .then(({ data, error }) => {
                                if (!error && data) {
                                  setSplits(data.map((s: any) => ({
                                    ...s,
                                    profiles: {
                                      id: s.user_id,
                                      full_name: s.full_name,
                                      avatar_url: s.avatar_url,
                                    },
                                  })));
                                }
                                setIsLoadingSplits(false);
                              });
                          }}
                        />
                      </motion.div>
                    );
                  })}
              </div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Settle Your Share Section - NEW */}
        {identity?.id && userSplit && !isPaid && (
          <SettleExpenseSection
            payerName={payerName}
            amountOwed={userIOwes}
            currency={expense.currency}
            isSettled={userSplit.is_settled || false}
            onSettle={handleSettleUserSplit}
            isSettling={settlingUserSplit}
          />
        )}

        {/* Receipts, Bills & Comments */}
        <Card className="rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              {t('expenses.receiptsBillsComments', 'Receipts, Bills & Comments')}
              {(displayAttachments.length > 0 || expense.comment) && (
                <Badge variant="secondary" className="ml-1">
                  {displayAttachments.length + (expense.comment ? 1 : 0)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Comment Section */}
            {expense.comment && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold">{t('expenses.comment', 'Comment')}</h3>
                </div>
                <div className="p-4 md:p-5 bg-muted/30 rounded-lg border backdrop-blur-sm">
                  <MarkdownComment content={expense.comment} />
                </div>
              </motion.div>
            )}

            {/* Separator between sections */}
            {expense.comment && displayAttachments.length > 0 && (
              <Separator className="my-4" />
            )}

            {/* Attachments Section */}
            {displayAttachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold">
                    {t('expenses.receiptsAndBills', 'Receipts & Bills')} ({displayAttachments.length})
                  </h3>
                </div>
                <AttachmentList
                  attachments={displayAttachments}
                  canDelete={canEdit}
                  onDelete={handleAttachmentDelete}
                />
              </motion.div>
            )}

            {/* Empty State - only show when both are empty */}
            {!expense.comment && displayAttachments.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-8 md:py-12 text-center"
              >
                <div className="rounded-full bg-muted/50 p-4 mb-4 backdrop-blur-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground/70"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2">
                  {t('expenses.noDocuments', 'No documents attached')}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground max-w-sm mb-4">
                  {t('expenses.noDocumentsDescription', 'Add receipts, bills, or comments when editing this expense to keep better records.')}
                </p>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => go({ to: `/expenses/edit/${expense.id}` })}
                    className="mt-2"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {t('expenses.addDocuments', 'Add Documents')}
                  </Button>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Settle Split Dialog */}
      {selectedSplit && (
        <SettleSplitDialog
          open={settleSplitDialogOpen}
          onOpenChange={setSettleSplitDialogOpen}
          userName={selectedSplit.profiles?.full_name || t('profile.unknown')}
          computedAmount={selectedSplit.computed_amount}
          currency={expense.currency}
          onConfirm={handleSettleSplit}
          isSettling={settlingSplitId === selectedSplit.id}
        />
      )}

      {/* Settle Split Dialog */}
      {selectedSplit && (
        <SettleSplitDialog
          open={settleSplitDialogOpen}
          onOpenChange={setSettleSplitDialogOpen}
          userName={selectedSplit.profiles?.full_name || t('profile.unknown')}
          computedAmount={selectedSplit.computed_amount - (selectedSplit.settled_amount || 0)}
          currency={expense.currency}
          onConfirm={handleSettleSplit}
          isSettling={settlingSplitId === selectedSplit.id}
        />
      )}

      {/* Mobile Bottom Navigation - Fixed at bottom on mobile only */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur-md border-t shadow-lg z-40">
        <div className="grid grid-cols-3 gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col gap-1 h-auto py-2"
            onClick={() => {
              if (expense.group_id) {
                go({ to: `/groups/show/${expense.group_id}` });
              } else if (expense.friendship_id) {
                go({ to: `/friends/${expense.friendship_id}` });
              } else {
                go({ to: `/dashboard` });
              }
            }}
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-xs">{t('common.back', 'Back')}</span>
          </Button>

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col gap-1 h-auto py-2"
              onClick={() => go({ to: `/expenses/edit/${expense.id}` })}
            >
              <PencilIcon className="h-5 w-5" />
              <span className="text-xs">{t('common.edit', 'Edit')}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col gap-1 h-auto py-2"
            onClick={() => {
              const url = expense.group_id
                ? `/expenses/create?groupId=${expense.group_id}`
                : expense.friendship_id
                  ? `/expenses/create?friendshipId=${expense.friendship_id}`
                  : `/expenses/create`;
              go({ to: url });
            }}
          >
            <PlusIcon className="h-5 w-5" />
            <span className="text-xs">{t('expenses.newExpense', 'New')}</span>
          </Button>
        </div>
      </div>

      {/* Desktop Floating Action Button */}
      <Button
        size="lg"
        className="hidden md:flex fixed bottom-6 right-6 h-14 w-14 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 z-50 items-center justify-center"
        onClick={() => {
          const url = expense.group_id
            ? `/expenses/create?groupId=${expense.group_id}`
            : expense.friendship_id
              ? `/expenses/create?friendshipId=${expense.friendship_id}`
              : `/expenses/create`;
          go({ to: url });
        }}
      >
        <PlusIcon className="h-6 w-6" />
      </Button>
    </div>
  );
};
