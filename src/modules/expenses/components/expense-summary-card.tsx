import { useState, useCallback, useMemo, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  PencilIcon,
  Trash2Icon,
  ShareIcon,
  CopyIcon,
  MoreVerticalIcon,
  RepeatIcon,
  CalendarIcon,
  PauseIcon,
  PlayIcon,
  UserIcon,
  MessageSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/ui/icons";
import { CategoryIcon } from "./category-icon";
import { CommentInput } from "./comment-input";
import { CommentItem } from "./comment-item";
import { ReactionBar } from "./reaction-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpenseComments } from "../hooks/use-expense-comments";
import { useReactionTypes, useExpenseReactions } from "../hooks/use-reactions";
import { formatDate, formatNumber, formatCurrency } from "@/lib/locale-utils";
import { getOweStatusColors } from "@/lib/status-colors";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { getFrequencyDescription } from "../types/recurring";
import type { RecurringExpense } from "../types/recurring";
import type { CommentUser } from "../types/comments";
import { buildExpenseShareUrl } from "../utils/share-url";
import { useHaptics } from "@/hooks/use-haptics";

interface ExpenseSummaryCardProps {
  expense: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    expense_date: string;
    created_at?: string;
    updated_at?: string;
    category?: string;
    paid_by_user_id: string;
    is_payment?: boolean;
    comment?: string;
    profiles?: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
  };
  canEdit: boolean;
  isLoan: boolean;
  borrowerName?: string;
  recurringData?: (RecurringExpense & { expenses?: unknown }) | null;
  userPosition?: {
    iOwe: number;
    iAmOwed: number;
    netPosition: number;
    isSettled: boolean;
  };
  onEdit: () => void;
  onDelete: () => void;
  currentUser?: CommentUser | null;
  participants?: CommentUser[];
  maxVisibleComments?: number;
  initialCommentsExpanded?: boolean;
}

export const ExpenseSummaryCard = memo(({
  expense,
  canEdit,
  isLoan,
  borrowerName,
  recurringData,
  userPosition,
  onEdit,
  onDelete,
  currentUser = null,
  participants = [],
  maxVisibleComments = 3,
  initialCommentsExpanded = false,
}: ExpenseSummaryCardProps) => {
  const { t, i18n } = useTranslation();
  const { tap, warning } = useHaptics();
  const dateLocale = i18n.language === "vi" ? vi : enUS;
  const [commentsExpanded, setCommentsExpanded] = useState(initialCommentsExpanded);

  // Comment & reaction hooks
  const {
    comments,
    isLoading: commentsLoading,
    isSubmitting,
    totalCount,
    addComment,
    updateComment,
    deleteComment,
  } = useExpenseComments(expense.id);
  const { reactionTypes } = useReactionTypes();
  const {
    toggleReaction,
    createAndToggleReaction,
    getReactionsForTarget,
  } = useExpenseReactions(expense.id);

  const derivedCommenters = useMemo(() => {
    const seen = new Set<string>();
    const result: CommentUser[] = [];
    for (const c of comments) {
      if (!seen.has(c.user_id)) { seen.add(c.user_id); result.push(c.user); }
      if (c.replies) {
        for (const r of c.replies) {
          if (!seen.has(r.user_id)) { seen.add(r.user_id); result.push(r.user); }
        }
      }
    }
    return result;
  }, [comments]);

  const handleAddComment = useCallback(
    async (content: string, mentionedUserIds: string[]) => {
      await addComment(content, undefined, mentionedUserIds);
    },
    [addComment],
  );

  const handleReply = useCallback(
    (parentId: string) => async (content: string, mentionedUserIds: string[]) => {
      await addComment(content, parentId, mentionedUserIds);
    },
    [addComment],
  );

  const handleToggleCommentReaction = useCallback(
    (commentId: string, reactionTypeId: string) => {
      toggleReaction("comment", commentId, reactionTypeId);
    },
    [toggleReaction],
  );

  const handleToggleExpenseReaction = useCallback(
    (reactionTypeId: string) => {
      toggleReaction("expense", expense.id, reactionTypeId);
    },
    [toggleReaction, expense.id],
  );

  const handleCreateAndToggleExpenseReaction = useCallback(
    (emojiMartId: string, nativeEmoji: string, label: string) => {
      createAndToggleReaction("expense", expense.id, emojiMartId, nativeEmoji, label);
    },
    [createAndToggleReaction, expense.id],
  );

  const handleCreateAndToggleCommentReaction = useCallback(
    (commentId: string, emojiMartId: string, nativeEmoji: string, label: string) => {
      createAndToggleReaction("comment", commentId, emojiMartId, nativeEmoji, label);
    },
    [createAndToggleReaction],
  );

  const getReactionsForComment = useCallback(
    (commentId: string) => getReactionsForTarget("comment", commentId),
    [getReactionsForTarget],
  );

  const expenseReactions = getReactionsForTarget("expense", expense.id);
  const hasCommentsOrReactions = comments.length > 0 || expenseReactions.length > 0;

  const getShareUrl = useCallback(() => {
    return buildExpenseShareUrl(expense, window.location.href);
  }, [expense]);

  const handleShare = async () => {
    tap();
    const shareUrl = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: expense.description,
          text: `Check out this expense: ${expense.description}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    tap();
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success(t("common.linkCopied", "Link copied to clipboard"));
    } catch {
      toast.error(t("common.copyFailed", "Failed to copy link"));
    }
  };

  const statusColors = userPosition
    ? getOweStatusColors(
        userPosition.iOwe > 0 ? "owe" : userPosition.iAmOwed > 0 ? "owed" : "neutral"
      )
    : null;

  return (
    <Card className="rounded-xl border-2 shadow-sm overflow-hidden">
      <CardContent className="p-4 md:p-6">
        {/* Header: Title + Date + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5">
              {expense.category && (
                <CategoryIcon category={expense.category} size="sm" showLabel={false} />
              )}
              <h1 className="text-xl md:text-2xl font-bold break-words leading-tight">
                {expense.description}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(expense.expense_date, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleShare}
              aria-label={t("common.share", "Share")}
            >
              <ShareIcon className="h-4 w-4" />
            </Button>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => tap()}>
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <CopyIcon className="h-4 w-4 mr-2" />
                    {t("common.copyLink", "Copy Link")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { tap(); onEdit(); }}>
                    <PencilIcon className="h-4 w-4 mr-2" />
                    {t("common.edit", "Edit")}
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2Icon className="h-4 w-4 mr-2" />
                        {t("common.delete", "Delete")}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("expenses.deleteTitle", "Delete Expense?")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t(
                            "expenses.deleteDescription",
                            "This action cannot be undone. This will permanently delete this expense and all associated splits."
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { warning(); onDelete(); }}>
                          {t("common.delete", "Delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Amount + Payer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className={cn(
            "p-4 rounded-lg border",
            isLoan
              ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50"
              : "bg-muted/30 border-border"
          )}
        >
          {isLoan && (
            <div className="flex justify-center mb-3">
              <Badge
                variant="outline"
                className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>
                {t("expenses.loan")}
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Avatar className={cn("h-12 w-12 border-2 shadow-sm", isLoan ? "border-amber-200 dark:border-amber-700" : "border-primary/20")}>
              <AvatarImage src={expense.profiles?.avatar_url || undefined} alt={expense.profiles?.full_name} />
              <AvatarFallback className="text-sm font-bold bg-muted">
                {expense.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {isLoan ? t("expenses.lentBy") : t("expenses.paidBy")}
              </p>
              <p className="font-semibold text-sm mt-0.5 truncate">
                {expense.profiles?.full_name || t("profile.unknown")}
              </p>
              {isLoan && borrowerName && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {t("expenses.lentTo", { name: borrowerName })}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {isLoan ? t("expenses.loanAmount") : t("expenses.totalAmount")}
              </p>
              <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                <span className={cn("text-2xl font-bold", isLoan ? "text-amber-600 dark:text-amber-400" : "text-primary")}>
                  {formatNumber(expense.amount)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">{expense.currency}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Your Position - inline */}
        {userPosition && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("expense.yourPosition", "Your Position")}</span>
                {userPosition.isSettled && (
                  <Badge variant="outline" className="text-xs">{t("status.settled", "Settled")}</Badge>
                )}
              </div>
              <span className={cn("text-lg font-bold", statusColors?.text)}>
                {userPosition.netPosition >= 0 ? "+" : ""}
                {formatCurrency(userPosition.netPosition, expense.currency)}
              </span>
            </div>
            {(userPosition.iOwe > 0 || userPosition.iAmOwed > 0) && (
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                {userPosition.iOwe > 0 && (
                  <span>{t("expense.youOwe", "You owe")}: <span className={cn("font-medium", getOweStatusColors("owe").text)}>{formatCurrency(userPosition.iOwe, expense.currency)}</span></span>
                )}
                {userPosition.iAmOwed > 0 && (
                  <span>{t("expense.youAreOwed", "You are owed")}: <span className={cn("font-medium", getOweStatusColors("owed").text)}>{formatCurrency(userPosition.iAmOwed, expense.currency)}</span></span>
                )}
              </div>
            )}
          </>
        )}

        {/* Recurring Info - inline */}
        {recurringData && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                  <RepeatIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium">{t("recurring.scheduleInfo", "Recurring Schedule")}</span>
                <Badge
                  variant={recurringData.is_active ? "default" : "secondary"}
                  className={cn("text-xs", recurringData.is_active && "bg-blue-600 hover:bg-blue-700")}
                >
                  {recurringData.is_active ? (
                    <><PlayIcon className="h-3 w-3 mr-0.5" />{t("recurring.active", "Active")}</>
                  ) : (
                    <><PauseIcon className="h-3 w-3 mr-0.5" />{t("recurring.paused", "Paused")}</>
                  )}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div>
                <p className="text-muted-foreground">{t("recurring.frequency", "Frequency")}</p>
                <p className="font-medium mt-0.5">
                  {getFrequencyDescription(recurringData.frequency as "weekly" | "bi_weekly" | "monthly" | "quarterly" | "yearly" | "custom", recurringData.interval)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("recurring.nextCreation", "Next creation")}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  <p className="font-medium">
                    {format(new Date(recurringData.next_occurrence), "PPP", { locale: dateLocale })}
                  </p>
                </div>
              </div>
              {recurringData.end_date && (
                <div>
                  <p className="text-muted-foreground">{t("recurring.endsOn", "Ends on")}</p>
                  <p className="font-medium mt-0.5">
                    {format(new Date(recurringData.end_date), "PPP", { locale: dateLocale })}
                  </p>
                </div>
              )}
              {recurringData.prepaid_until && (
                <div>
                  <p className="text-muted-foreground">{t("recurring.prepaid.prepaidUntil", "Prepaid until")}</p>
                  <p className="font-medium text-green-600 mt-0.5">
                    {format(new Date(recurringData.prepaid_until), "PPP", { locale: dateLocale })}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Inline Comments & Reactions */}
        {(hasCommentsOrReactions || currentUser) && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              {/* Expense-level reactions */}
              {(expenseReactions.length > 0 || reactionTypes.length > 0) && (
                <ReactionBar
                  reactions={expenseReactions}
                  reactionTypes={reactionTypes}
                  onToggle={handleToggleExpenseReaction}
                  onCreateAndToggle={handleCreateAndToggleExpenseReaction}
                  size="sm"
                />
              )}

              {/* Comments */}
              {commentsLoading ? (
                <div className="flex gap-2.5">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.length > maxVisibleComments && !commentsExpanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => { tap(); setCommentsExpanded(true); }}
                    >
                      <ChevronDownIcon className="h-3.5 w-3.5 mr-1" />
                      {t("expenses.comments.showAll", {
                        count: comments.length - maxVisibleComments,
                        defaultValue: `Show ${comments.length - maxVisibleComments} older comments`,
                      })}
                    </Button>
                  )}
                  {comments.length > maxVisibleComments && commentsExpanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => { tap(); setCommentsExpanded(false); }}
                    >
                      <ChevronUpIcon className="h-3.5 w-3.5 mr-1" />
                      {t("expenses.comments.showLess", "Show less")}
                    </Button>
                  )}
                  {(commentsExpanded ? comments : comments.slice(-maxVisibleComments)).map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUser?.id}
                      currentUser={currentUser}
                      participants={participants}
                      reactions={getReactionsForComment(comment.id)}
                      reactionTypes={reactionTypes}
                      onToggleReaction={(rtId) => handleToggleCommentReaction(comment.id, rtId)}
                      onCreateAndToggleReaction={(emojiMartId, nativeEmoji, label) => handleCreateAndToggleCommentReaction(comment.id, emojiMartId, nativeEmoji, label)}
                      onReply={handleReply(comment.id)}
                      onUpdate={updateComment}
                      onDelete={deleteComment}
                      isSubmitting={isSubmitting}
                      getReactionsForComment={getReactionsForComment}
                      onToggleReplyReaction={handleToggleCommentReaction}
                      onCreateAndToggleReplyReaction={handleCreateAndToggleCommentReaction}
                    />
                  ))}
                </div>
              ) : null}

              {/* Comment input */}
              {currentUser && (
                <>
                  {comments.length > 0 && <Separator />}
                  <CommentInput
                    currentUser={currentUser}
                    participants={participants}
                    commenters={derivedCommenters}
                    onSubmit={handleAddComment}
                    isSubmitting={isSubmitting}
                    customReactions={reactionTypes}
                    compact={comments.length === 0}
                  />
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

ExpenseSummaryCard.displayName = "ExpenseSummaryCard";
