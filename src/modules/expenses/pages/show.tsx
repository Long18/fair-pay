import { useState, useEffect } from "react";
import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense, ExpenseSplit, Attachment } from "../types";
import { AttachmentList } from "../components/attachment-list";
import { CategoryIcon } from "../components/category-icon";
import { Profile } from "@/modules/profile/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { supabaseClient } from "@/utility/supabaseClient";
import { useTranslation } from "react-i18next";

import { ArrowLeftIcon, PencilIcon, Trash2Icon, CheckCircle2Icon, XCircleIcon } from "@/components/ui/icons";
import { SettleSplitDialog } from "../components/settle-split-dialog";
import { Spinner } from "@/components/ui/spinner";
import { MomoPaymentButton } from "@/modules/payments/components/momo-payment-button";
import { MarkdownComment } from "../components/markdown-comment";

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
              split_method: split.split_method,
              split_value: split.split_value,
              computed_amount: split.computed_amount,
              is_settled: split.is_settled,
              settled_amount: split.settled_amount,
              settled_at: split.settled_at,
              created_at: split.created_at,
              profiles: {
                id: split.user_id,
                full_name: split.user_full_name,
                avatar_url: split.user_avatar_url,
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

  // Handle settle entire expense
  const handleSettleExpense = async () => {
    if (!expense?.id) return;

    setSettlingExpense(true);
    try {
      const { data, error } = await supabaseClient.rpc('settle_expense', {
        p_expense_id: expense.id,
      });

      if (error) throw error;

      toast.success(t('expenses.settleSuccess', {
        description: expense.description,
        defaultValue: `Marked "${expense.description}" as paid`,
      }));

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
              full_name: split.user_full_name,
              avatar_url: split.user_avatar_url,
            },
          }));
          setSplits(transformedSplits);
        }
        setIsLoadingSplits(false);
      }
      setSettleAllDialogOpen(false);
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
              full_name: split.user_full_name,
              avatar_url: split.user_avatar_url,
            },
          }));
          setSplits(transformedSplits);
        }
        setIsLoadingSplits(false);
      }
      setSettleSplitDialogOpen(false);
      setSelectedSplit(null);
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
          go({ to: `/groups/show/${expense.group_id}` });
        },
        onError: (error) => {
          toast.error(`Failed to delete expense: ${error.message}`);
        },
      }
    );
  };

  if (isLoadingExpense || isLoadingSplits || !expense || loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Spinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  return (
      <div className="w-full max-w-4xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: `/groups/show/${expense.group_id}` })}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Back to Group</span>
        <span className="sm:hidden">Back</span>
      </Button>

      <div className="space-y-4 md:space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <CardTitle className="text-2xl sm:text-3xl break-words">{expense.description}</CardTitle>
                  {expense.category && (
                    <CategoryIcon category={expense.category} size="md" showLabel />
                  )}
                </div>
                <p className="text-muted-foreground">
                  {formatDate(expense.expense_date, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => go({ to: `/expenses/edit/${expense.id}` })}
                  >
                    <PencilIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
                        <Trash2Icon className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete
                          this expense and all associated splits.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 p-4 md:p-6 bg-gradient-to-br from-muted/50 to-muted rounded-xl shadow-sm">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-4 border-background shadow-lg ring-4 ring-primary/10">
                <AvatarImage src={expense.profiles?.avatar_url || undefined} alt={expense.profiles?.full_name} />
                <AvatarFallback className="text-base sm:text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                  {expense.profiles?.full_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">{t('expenses.paidBy')}</p>
                <p className="font-bold text-base sm:text-lg line-clamp-2 leading-tight break-words" title={expense.profiles?.full_name || t('profile.unknown')}>
                  {expense.profiles?.full_name || t('profile.unknown')}
                </p>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">{t('expenses.totalAmount')}</p>
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {formatNumber(expense.amount)} {expense.currency}
                </p>
              </div>
            </div>

            {expense.comment && (
              <div className="p-4 md:p-6 bg-muted/50 rounded-xl border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('expenses.comment', 'Comment')}</h3>
                <MarkdownComment content={expense.comment} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
              <CardTitle className="text-base md:text-lg">{t('expenses.splitDetails')}</CardTitle>
              {isPayer && !isPaid && splits.length > 0 && (
                <AlertDialog open={settleAllDialogOpen} onOpenChange={setSettleAllDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                      <CheckCircle2Icon className="h-4 w-4 mr-2" />
                      {t('expenses.settleAll', 'Settle All')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('expenses.settleAllTitle', 'Mark as Paid')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('expenses.settleAllDescription', {
                          description: expense.description,
                          amount: formatNumber(expense.amount),
                          defaultValue: `Mark "${expense.description}" (${formatNumber(expense.amount)} ${expense.currency}) as paid? All participants will be marked as settled.`,
                        })}
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
              <div className="space-y-3 md:space-y-4">
                {splits.map((split: any) => {
                  const isCurrentUserSplit = split.user_id === identity?.id;
                  const isSplitSettled = split.is_settled || isPaid;
                  const canSettle = isPayer && !isSplitSettled && !isCurrentUserSplit;
                  const isPartiallySettled = split.is_settled && split.settled_amount < split.computed_amount;

                  return (
                    <div
                      key={split.id}
                      className={`group flex flex-col p-3 md:p-4 border-2 rounded-xl transition-all duration-200 ${
                        isSplitSettled
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                          : 'hover:border-primary/50 hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex flex-row items-center justify-between gap-3 md:gap-4">
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <Avatar className={`h-10 w-10 sm:h-12 sm:w-12 border-2 shadow-md ring-2 ring-offset-1 ring-offset-background transition-all duration-200 flex-shrink-0 ${
                          isSplitSettled
                            ? 'border-green-300 dark:border-green-700 ring-green-200 dark:ring-green-800'
                            : 'border-background ring-primary/20 group-hover:ring-primary/50'
                        }`}>
                          <AvatarImage src={split.profiles?.avatar_url || undefined} alt={split.profiles?.full_name} />
                          <AvatarFallback className={`text-xs sm:text-sm font-semibold ${
                            isSplitSettled
                              ? 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950/40 dark:to-green-950/20 text-green-700 dark:text-green-300'
                              : 'bg-gradient-to-br from-muted to-muted/50'
                          }`}>
                            {split.profiles?.full_name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm sm:text-base line-clamp-2 leading-tight transition-colors break-words ${
                            isSplitSettled ? 'text-green-700 dark:text-green-300' : 'group-hover:text-primary'
                          }`} title={split.profiles?.full_name || t('profile.unknown')}>
                            {split.profiles?.full_name || t('profile.unknown')}
                            {isCurrentUserSplit && (
                              <span className="text-xs text-muted-foreground ml-2 font-normal">
                                ({t('common.you')})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className="text-xs text-muted-foreground font-medium">
                              {String(t(`expenses.${split.split_method}`, split.split_method))}
                            </div>
                            {isSplitSettled && !isPartiallySettled && (
                              <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                                <CheckCircle2Icon className="h-3 w-3 mr-1" />
                                {t('expenses.paid', 'Paid')}
                              </Badge>
                            )}
                            {isPartiallySettled && (
                              <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                                <CheckCircle2Icon className="h-3 w-3 mr-1" />
                                {t('expenses.partiallyPaid', 'Partially Paid')}
                              </Badge>
                            )}
                            {!isSplitSettled && !isCurrentUserSplit && (
                              <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                {t('expenses.unpaid', 'Unpaid')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex flex-col items-end">
                            {isPartiallySettled ? (
                              <>
                                <div className="font-bold text-base sm:text-lg text-amber-600 dark:text-amber-400">
                                  {formatNumber(split.computed_amount - split.settled_amount)} {expense.currency}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t('expenses.remaining', 'Remaining')} ({formatNumber(split.settled_amount)} / {formatNumber(split.computed_amount)} {t('expenses.paid', 'paid')})
                                </div>
                              </>
                            ) : (
                              <div className={`font-bold text-base sm:text-lg transition-transform ${
                                isSplitSettled ? 'text-green-600 dark:text-green-400' : ''
                              }`}>
                                {formatNumber(split.computed_amount)} {expense.currency}
                              </div>
                            )}
                          </div>
                          {canSettle && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                              onClick={() => openSettleDialog(split)}
                              disabled={settlingSplitId === split.id}
                            >
                              {settlingSplitId === split.id ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2Icon className="h-4 w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">{t('expenses.settle', 'Settle')}</span>
                                </>
                              )}
                            </Button>
                          )}
                          {/* MoMo payment button for the user who owes */}
                          {isCurrentUserSplit && !isSplitSettled && !isPayer && (
                            <MomoPaymentButton
                              split={split}
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
                                          full_name: s.user_full_name,
                                          avatar_url: s.user_avatar_url,
                                        },
                                      })));
                                    }
                                    setIsLoadingSplits(false);
                                  });
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </CardContent>
        </Card>

        {/* Receipts/Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              {t('expenses.receipts', 'Receipts & Bills')}
              {displayAttachments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {displayAttachments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayAttachments.length > 0 ? (
              <AttachmentList
                attachments={displayAttachments}
                canDelete={canEdit}
                onDelete={handleAttachmentDelete}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                <div className="rounded-full bg-muted p-3 md:p-4 mb-3 md:mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2">
                  {t('expenses.noReceipts', 'No receipts uploaded')}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground max-w-sm">
                  {t('expenses.noReceiptsDescription', 'Receipts and bills can be uploaded when creating or editing this expense.')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
};
