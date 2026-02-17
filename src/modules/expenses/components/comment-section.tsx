import { useState, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
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
  maxVisible?: number;
}

export const CommentSection = memo(({
  expenseId,
  currentUser,
  participants,
  maxVisible = 3,
}: CommentSectionProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
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
    createAndToggleReaction,
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

  const handleCreateAndToggleExpenseReaction = useCallback(
    (emojiMartId: string, nativeEmoji: string, label: string) => {
      createAndToggleReaction("expense", expenseId, emojiMartId, nativeEmoji, label);
    },
    [createAndToggleReaction, expenseId],
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
              onCreateAndToggle={handleCreateAndToggleExpenseReaction}
              size="md"
            />
            <Separator />
          </>
        )}

        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t("expenses.comments.empty", "No comments yet. Be the first to comment!")}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Show older comments toggle */}
            {comments.length > maxVisible && !expanded && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(true)}
              >
                <ChevronDownIcon className="h-3.5 w-3.5 mr-1" />
                {t("expenses.comments.showAll", {
                  count: comments.length - maxVisible,
                  defaultValue: `Show ${comments.length - maxVisible} older comments`,
                })}
              </Button>
            )}
            {comments.length > maxVisible && expanded && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(false)}
              >
                <ChevronUpIcon className="h-3.5 w-3.5 mr-1" />
                {t("expenses.comments.showLess", "Show less")}
              </Button>
            )}
            {(expanded ? comments : comments.slice(-maxVisible)).map((comment) => (
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
        )}

        <Separator />

        {/* New comment input */}
        <CommentInput
          currentUser={currentUser}
          participants={participants}
          commenters={derivedCommenters}
          onSubmit={handleAddComment}
          isSubmitting={isSubmitting}
          customReactions={reactionTypes}
        />
      </CardContent>
    </Card>
  );
});

CommentSection.displayName = "CommentSection";
