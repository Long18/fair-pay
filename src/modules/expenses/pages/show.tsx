import { useState, useEffect, useMemo, useCallback } from "react";
import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense, Attachment } from "../types";
import { AttachmentList } from "../components/attachment-list";
import { ExpenseSummaryCard } from "../components/expense-summary-card";
import { ExpenseSplitCard } from "../components/expense-split-card";
import { Profile } from "@/modules/profile/types";
import { Badge } from "@/components/ui/badge";
import { CommentSection } from "../components/comment-section";
import type { CommentUser } from "../types/comments";
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
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  PlusIcon,
  HomeIcon,
  PencilIcon,
  MessageSquareIcon,
  FileTextIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { SettleSplitDialog } from "../components/settle-split-dialog";
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
import { RecurringExpense } from "../types/recurring";
import { cn } from "@/lib/utils";

// Helper to transform split data from RPC response
const transformSplitData = (data: any[]) =>
  (data || []).map((split: any) => ({
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
  const [notesOpen, setNotesOpen] = useState(false);

  // Fetch recurring expense data linked to this expense (as template)
  const { data: recurringData } = useQuery({
    queryKey: ["recurring_for_expense", id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("recurring_expenses")
        .select("*, expenses!template_expense_id(id, description, amount, currency)")
        .eq("template_expense_id", id!)
        .maybeSingle();
      if (error) {
        console.error("Error fetching recurring data:", error);
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

  const refetchExpense = useCallback(() => {
    expenseQuery.refetch();
  }, [expenseQuery]);

  // Fetch splits via RPC
  const fetchSplits = useCallback(async () => {
    if (!id) return;
    setIsLoadingSplits(true);
    try {
      const { data, error } = await supabaseClient.rpc("get_expense_splits_public", {
        p_expense_id: id,
      });
      if (error) {
        console.error("Error fetching splits:", error);
        setSplits([]);
      } else {
        setSplits(transformSplitData(data || []));
      }
    } finally {
      setIsLoadingSplits(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSplits();
  }, [fetchSplits]);

  const { query: attachmentsQuery } = useList<Attachment>({
    resource: "attachments",
    filters: [{ field: "expense_id", operator: "eq", value: id }],
    meta: { select: "*, uploaded_by" },
    queryOptions: { refetchOnWindowFocus: true, refetchOnMount: "always" },
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

  // Detect loan pattern
  const isLoan = useMemo(() => {
    if (!expense || expense.context_type !== "friend" || splits.length !== 2) return false;
    const payerSplit = splits.find((s: any) => s.user_id === expense.paid_by_user_id);
    const borrowerSplit = splits.find((s: any) => s.user_id !== expense.paid_by_user_id);
    if (!payerSplit || !borrowerSplit) return false;
    return payerSplit.computed_amount === 0 && Math.abs(borrowerSplit.computed_amount - expense.amount) < 1;
  }, [expense, splits]);

  const borrowerName = useMemo(() => {
    if (!isLoan || !expense) return undefined;
    const borrowerSplit = splits.find((s: any) => s.user_id !== expense.paid_by_user_id);
    return borrowerSplit?.profiles?.full_name || undefined;
  }, [isLoan, expense, splits]);

  // User position calculations
  const userSplit = splits.find((s) => s.user_id === identity?.id);
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
        setUserIsAdmin(await isAdmin());
      } catch {
        setUserIsAdmin(false);
      }
    };
    if (identity?.id) checkAdminStatus();
  }, [identity?.id]);

  // Handle settle entire expense
  const handleSettleExpense = async () => {
    if (!expense?.id) return;
    setSettlingExpense(true);
    try {
      const { data, error } = await supabaseClient.rpc("settle_all_splits", {
        p_expense_id: expense.id,
      });
      if (error) throw error;
      const splitsUpdated = data?.splits_updated || 0;
      const alreadyPaid = data?.already_paid || 0;
      toast.success(
        t("expenses.settleAllSuccess", {
          splitsUpdated,
          alreadyPaid,
          defaultValue: `Settled ${splitsUpdated} of ${splitsUpdated + alreadyPaid} splits. ${alreadyPaid} already paid.`,
        })
      );
      refetchExpense();
      await fetchSplits();
      setSettleAllDialogOpen(false);
      dispatchSettlementEvent();
    } catch (error: any) {
      console.error("Error settling expense:", error);
      toast.error(
        t("expenses.settleError", { defaultValue: `Failed to settle: ${error.message}` })
      );
    } finally {
      setSettlingExpense(false);
    }
  };

  // Handle settle individual split
  const handleSettleSplit = async (amount: number) => {
    if (!selectedSplit) return;
    setSettlingSplitId(selectedSplit.id);
    try {
      const { error } = await supabaseClient.rpc("settle_split", {
        p_split_id: selectedSplit.id,
        p_amount: amount,
      });
      if (error) throw error;
      const isPartial = amount < selectedSplit.computed_amount;
      toast.success(
        isPartial
          ? t("expenses.partialSettleSuccess", {
              userName: selectedSplit.profiles?.full_name,
              amount: formatNumber(amount),
              defaultValue: `Partial payment of ${formatNumber(amount)} ${expense.currency} from ${selectedSplit.profiles?.full_name} marked as received`,
            })
          : t("expenses.splitSettleSuccess", {
              userName: selectedSplit.profiles?.full_name,
              defaultValue: `Payment from ${selectedSplit.profiles?.full_name} marked as received`,
            })
      );
      await fetchSplits();
      setSettleSplitDialogOpen(false);
      setSelectedSplit(null);
      dispatchSettlementEvent();
    } catch (error: any) {
      console.error("Error settling split:", error);
      toast.error(
        t("expenses.splitSettleError", { defaultValue: `Failed to settle: ${error.message}` })
      );
    } finally {
      setSettlingSplitId(null);
    }
  };

  const openSettleDialog = (split: any) => {
    setSelectedSplit(split);
    setSettleSplitDialogOpen(true);
  };

  // Sync displayAttachments with fetched attachments
  useEffect(() => {
    setDisplayAttachments(attachments);
  }, [attachments]);

  // Handle loading state
  useEffect(() => {
    if (!isLoadingExpense && !isLoadingSplits) {
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoadingExpense, isLoadingSplits]);

  const handleAttachmentDelete = (attachmentId: string) => {
    setDisplayAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const handleDelete = () => {
    if (!expense?.id) return;
    deleteMutation.mutate(
      { resource: "expenses", id: expense.id },
      {
        onSuccess: () => {
          toast.success("Expense deleted successfully");
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

  // Sort splits: unpaid → partial → paid, current user first within same status
  const sortedSplits = useMemo(() => {
    return splits.slice().sort((a: any, b: any) => {
      const aSettled = a.is_settled || isPaid;
      const bSettled = b.is_settled || isPaid;
      const aPartial = a.is_settled && a.settled_amount < a.computed_amount;
      const bPartial = b.is_settled && b.settled_amount < b.computed_amount;
      const aStatus = aSettled ? (aPartial ? 1 : 2) : 0;
      const bStatus = bSettled ? (bPartial ? 1 : 2) : 0;
      if (aStatus !== bStatus) return aStatus - bStatus;
      const aIsCurrentUser = a.user_id === identity?.id;
      const bIsCurrentUser = b.user_id === identity?.id;
      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;
      return 0;
    });
  }, [splits, isPaid, identity?.id]);

  const hasNotes = !!(expense?.comment || displayAttachments.length > 0);
  const notesCount = displayAttachments.length + (expense?.comment ? 1 : 0);

  // Build participants list for comment @mentions
  const commentParticipants: CommentUser[] = useMemo(() => {
    const users: CommentUser[] = [];
    const seen = new Set<string>();
    if (expense?.profiles?.id && !seen.has(expense.profiles.id)) {
      seen.add(expense.profiles.id);
      users.push({
        id: expense.profiles.id,
        full_name: expense.profiles.full_name,
        avatar_url: expense.profiles.avatar_url || null,
      });
    }
    for (const s of splits) {
      if (s.user_id && !seen.has(s.user_id)) {
        seen.add(s.user_id);
        users.push({
          id: s.user_id,
          full_name: s.profiles?.full_name || "Unknown",
          avatar_url: s.profiles?.avatar_url || null,
        });
      }
    }
    return users;
  }, [expense, splits]);

  const currentCommentUser: CommentUser | null = identity
    ? { id: identity.id, full_name: identity.full_name || "", avatar_url: identity.avatar_url || null }
    : null;

  // Skeleton loading state
  if (isLoadingExpense || isLoadingSplits || !expense || loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-3 w-16 ml-auto" />
                  <Skeleton className="h-7 w-28 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-6 w-32" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
              {expense.group_id
                ? t("common.group", "Group")
                : t("common.friend", "Friend")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-muted-foreground">{expense.description}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        {/* 1. Expense Summary — header + amount + position + recurring */}
        <ExpenseSummaryCard
          expense={expense}
          canEdit={canEdit}
          isLoan={isLoan}
          borrowerName={borrowerName}
          recurringData={recurringData}
          userPosition={
            identity?.id && userSplit
              ? {
                  iOwe: userIOwes,
                  iAmOwed: userIsOwed,
                  netPosition,
                  isSettled: userSplit.is_settled || false,
                }
              : undefined
          }
          onEdit={() => go({ to: `/expenses/edit/${expense.id}` })}
          onDelete={handleDelete}
        />

        {/* 2. Comments & Reactions — visible first */}
        {id && (
          <CommentSection
            expenseId={id}
            currentUser={currentCommentUser}
            participants={commentParticipants}
            maxVisible={3}
          />
        )}

        {/* 3. Split Details */}
        <Card className="rounded-xl border-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                {t("expenses.splitDetails")}
                <Badge variant="secondary" className="text-xs">
                  {splits.length}
                </Badge>
              </CardTitle>
              {(isPayer || userIsAdmin) &&
                !isPaid &&
                splits.some((s) => !s.is_settled && s.user_id !== identity?.id) && (
                  <AlertDialog
                    open={settleAllDialogOpen}
                    onOpenChange={setSettleAllDialogOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 shadow-sm"
                      >
                        <CheckCircle2Icon className="h-4 w-4 mr-1.5" />
                        {t("expenses.settleAll", "Settle All")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("expenses.settleAllTitle", "Settle All Unpaid Splits?")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {(() => {
                            const unpaidCount = splits.filter(
                              (s) =>
                                !s.is_settled ||
                                s.settled_amount < s.computed_amount
                            ).length;
                            const alreadyPaidCount = splits.filter(
                              (s) =>
                                s.is_settled &&
                                s.settled_amount >= s.computed_amount
                            ).length;
                            return t("expenses.settleAllDescription", {
                              unpaidCount,
                              alreadyPaidCount,
                              defaultValue: `Mark ${unpaidCount} unpaid split${unpaidCount !== 1 ? "s" : ""} as settled? ${alreadyPaidCount} split${alreadyPaidCount !== 1 ? "s are" : " is"} already paid and will remain unchanged.`,
                            });
                          })()}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={settlingExpense}>
                          {t("common.cancel", "Cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSettleExpense}
                          disabled={settlingExpense}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {settlingExpense ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              {t("expenses.settling", "Settling...")}
                            </>
                          ) : (
                            <>
                              <CheckCircle2Icon className="h-4 w-4 mr-2" />
                              {t("expenses.confirmSettle", "Confirm")}
                            </>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {sortedSplits.map((split: any, index: number) => {
                  const isCurrentUserSplit = split.user_id === identity?.id;
                  const isSplitSettled = split.is_settled || isPaid;
                  const canSettle = userIsAdmin
                    ? !isSplitSettled
                    : isPayer && !isSplitSettled && !isCurrentUserSplit;

                  return (
                    <motion.div
                      key={split.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
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
                          fetchSplits();
                        }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* 4. Notes & Attachments — collapsible */}
        {hasNotes ? (
          <Card className="rounded-xl border shadow-sm">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 md:px-6 hover:bg-accent/30 transition-colors rounded-xl"
              onClick={() => setNotesOpen(!notesOpen)}
              aria-expanded={notesOpen}
            >
              <div className="flex items-center gap-2">
                <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {t("expenses.receiptsBillsComments", "Receipts, Bills & Comments")}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {notesCount}
                </Badge>
              </div>
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  notesOpen && "rotate-180"
                )}
              />
            </button>
            {notesOpen && (
              <CardContent className="pt-0 px-4 md:px-6 pb-4 space-y-4">
                <Separator />
                {expense.comment && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("expenses.comment", "Comment")}
                    </h3>
                    <div className="p-3 bg-muted/30 rounded-lg border text-sm">
                      <MarkdownComment content={expense.comment} />
                    </div>
                  </div>
                )}
                {expense.comment && displayAttachments.length > 0 && <Separator />}
                {displayAttachments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("expenses.receiptsAndBills", "Receipts & Bills")} (
                      {displayAttachments.length})
                    </h3>
                    <AttachmentList
                      attachments={displayAttachments}
                      canDelete={canEdit}
                      onDelete={handleAttachmentDelete}
                    />
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ) : (
          canEdit && (
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent/20 transition-colors"
              onClick={() => go({ to: `/expenses/edit/${expense.id}` })}
            >
              <FileTextIcon className="h-4 w-4" />
              {t("expenses.addDocuments", "Add Documents")}
            </button>
          )
        )}

        {/* Notes & Attachments section ends here */}
      </motion.div>

      {/* Settle Split Dialog */}
      {selectedSplit && (
        <SettleSplitDialog
          open={settleSplitDialogOpen}
          onOpenChange={setSettleSplitDialogOpen}
          userName={selectedSplit.profiles?.full_name || t("profile.unknown")}
          computedAmount={
            selectedSplit.computed_amount - (selectedSplit.settled_amount || 0)
          }
          currency={expense.currency}
          onConfirm={handleSettleSplit}
          isSettling={settlingSplitId === selectedSplit.id}
        />
      )}

      {/* Mobile Bottom Navigation */}
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
            <span className="text-xs">{t("common.back", "Back")}</span>
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col gap-1 h-auto py-2"
              onClick={() => go({ to: `/expenses/edit/${expense.id}` })}
            >
              <PencilIcon className="h-5 w-5" />
              <span className="text-xs">{t("common.edit", "Edit")}</span>
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
            <span className="text-xs">{t("expenses.newExpense", "New")}</span>
          </Button>
        </div>
      </div>

      {/* Desktop FAB */}
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
