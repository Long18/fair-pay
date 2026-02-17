import { useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareIcon } from "@/components/ui/icons";
import { CommentInput } from "./comment-input";
import { CommentItem } from "./comment-item";
import { ReactionBar } from "./reaction-bar";
import { Separator } from "@/components/ui/separator";
import { useExpenseComments } from "../hooks/use-expense-comments";
import { useReactionTypes, useExpenseReactions } from "../hooks/use-reactions";
import { useTranslation } from "react-i18next";
import type { CommentUser } from "../types/comments";

interface CommentSectionProps {
  expenseId: string;
  currentUser: CommentUser | null;
  participants: CommentUser[];
}

export const CommentSection = memo(({
  expenseId,
  currentUser,
  participants,
}: CommentSectionProps) => {
  const { t } = useTranslation();
  const {
    comments,
    isLoading,
    isSubmitting,
    totalCount,
    addComment,
    updateComment,
    deleteComment,
  } = useExpenseComments(expenseId);
  const { reactionTypes } = useReactionTypes();
  const {
    toggleReaction,
    getReactionsForTarget,
  } = useExpenseReactions(expenseId);

  // Derive unique commenters from comments (for @here mention)
  const derivedCommenters = useMemo(() => {
    const seen = new Set<string>();
    const result: CommentUser[] = [];
    for (const c of comments) {
      if (!seen.has(c.user_id)) {
        seen.add(c.user_id);
        result.push(c.user);
      }
      if (c.replies) {
        for (const r of c.replies) {
          if (!seen.has(r.user_id)) {
            seen.add(r.user_id);
            result.push(r.user);
          }
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
      toggleReaction("expense", expenseId, reactionTypeId);
    },
    [toggleReaction, expenseId],
  );

  const getReactionsForComment = useCallback(
    (commentId: string) => getReactionsForTarget("comment", commentId),
    [getReactionsForTarget],
  );

  if (isLoading) {
    return (
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquareIcon className="h-4 w-4" />
            {t("expenses.comments.title", "Comments")}
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expense-level reactions */}
        {(getReactionsForTarget("expense", expenseId).length > 0 || reactionTypes.length > 0) && (
          <>
            <ReactionBar
              reactions={getReactionsForTarget("expense", expenseId)}
              reactionTypes={reactionTypes}
              onToggle={handleToggleExpenseReaction}
              size="md"
            />
            <Separator />
          </>
        )}

        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("expenses.comments.empty", "No comments yet. Be the first to comment!")}
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUser?.id}
                currentUser={currentUser}
                participants={participants}
                reactions={getReactionsForComment(comment.id)}
                reactionTypes={reactionTypes}
                onToggleReaction={(rtId) => handleToggleCommentReaction(comment.id, rtId)}
                onReply={handleReply(comment.id)}
                onUpdate={updateComment}
                onDelete={deleteComment}
                isSubmitting={isSubmitting}
                getReactionsForComment={getReactionsForComment}
                onToggleReplyReaction={handleToggleCommentReaction}
              />
            ))}
          </div>
        )}

        <Separator />

        {/* New comment input */}
        <CommentInput
          currentUser={currentUser}
          participants={participants}
          commenters={derivedCommenters}
          onSubmit={handleAddComment}
          isSubmitting={isSubmitting}
        />
      </CardContent>
    </Card>
  );
});

CommentSection.displayName = "CommentSection";
