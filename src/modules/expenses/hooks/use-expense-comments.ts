import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ExpenseComment } from "../types/comments";

export const useExpenseComments = (expenseId: string | undefined) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<ExpenseComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!expenseId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient.rpc("get_expense_comments", {
        p_expense_id: expenseId,
      });
      if (error) throw error;
      setComments((data as ExpenseComment[]) || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!expenseId) return;
    const channel = supabaseClient
      .channel(`comments:${expenseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_comments",
          filter: `expense_id=eq.${expenseId}`,
        },
        () => { fetchComments(); }
      )
      .subscribe();
    return () => { supabaseClient.removeChannel(channel); };
  }, [expenseId, fetchComments]);

  const addComment = useCallback(
    async (content: string, parentId?: string, mentionedUserIds?: string[]) => {
      if (!expenseId) return null;
      setIsSubmitting(true);
      try {
        const { data, error } = await supabaseClient.rpc("add_expense_comment", {
          p_expense_id: expenseId,
          p_content: content,
          p_parent_id: parentId ?? null,
          p_mentioned_user_ids: mentionedUserIds ?? [],
        });
        if (error) throw error;
        await fetchComments();
        return data as ExpenseComment;
      } catch (error) {
        console.error("Error adding comment:", error);
        toast.error(t("expenses.comments.addError", "Failed to add comment"));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [expenseId, fetchComments, t],
  );

  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      try {
        const { error } = await supabaseClient.rpc("update_expense_comment", {
          p_comment_id: commentId,
          p_content: content,
        });
        if (error) throw error;
        await fetchComments();
      } catch (error) {
        console.error("Error updating comment:", error);
        toast.error(t("expenses.comments.updateError", "Failed to update comment"));
      }
    },
    [fetchComments, t],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        const { error } = await supabaseClient.rpc("delete_expense_comment", {
          p_comment_id: commentId,
        });
        if (error) throw error;
        await fetchComments();
      } catch (error) {
        console.error("Error deleting comment:", error);
        toast.error(t("expenses.comments.deleteError", "Failed to delete comment"));
      }
    },
    [fetchComments, t],
  );

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0), 0
  );

  return {
    comments,
    isLoading,
    isSubmitting,
    totalCount,
    addComment,
    updateComment,
    deleteComment,
    refetch: fetchComments,
  };
};
