import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ReactionType, ReactionSummary, ExpenseAllReactions } from "../types/comments";

export const useReactionTypes = () => {
  const [reactionTypes, setReactionTypes] = useState<ReactionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from("reaction_types")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        setReactionTypes((data as ReactionType[]) || []);
      } catch (error) {
        console.error("Error fetching reaction types:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { reactionTypes, isLoading };
};

export const useExpenseReactions = (expenseId: string | undefined) => {
  const { t } = useTranslation();
  const [reactions, setReactions] = useState<ExpenseAllReactions>({
    expense: [],
    comments: {},
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchReactions = useCallback(async () => {
    if (!expenseId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient.rpc(
        "get_expense_all_reactions",
        { p_expense_id: expenseId }
      );
      if (error) throw error;
      setReactions((data as ExpenseAllReactions) || { expense: [], comments: {} });
    } catch (error) {
      console.error("Error fetching reactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Realtime subscription
  useEffect(() => {
    if (!expenseId) return;
    const channel = supabaseClient
      .channel(`reactions:${expenseId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "expense_reactions",
      }, () => { fetchReactions(); })
      .subscribe();
    return () => { supabaseClient.removeChannel(channel); };
  }, [expenseId, fetchReactions]);

  const toggleReaction = useCallback(async (
    targetType: "expense" | "comment",
    targetId: string,
    reactionTypeId: string
  ) => {
    try {
      const { data, error } = await supabaseClient.rpc("toggle_reaction", {
        p_target_type: targetType,
        p_target_id: targetId,
        p_reaction_type_id: reactionTypeId,
      });
      if (error) throw error;
      await fetchReactions();
      return data as { action: "added" | "removed"; reaction_id: string };
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast.error(t("reactions.error", "Failed to update reaction"));
      return null;
    }
  }, [fetchReactions, t]);

  const getReactionsForTarget = useCallback((
    targetType: "expense" | "comment",
    targetId: string
  ): ReactionSummary[] => {
    if (targetType === "expense") return reactions.expense;
    return reactions.comments[targetId] || [];
  }, [reactions]);

  return {
    reactions,
    isLoading,
    toggleReaction,
    getReactionsForTarget,
    refetch: fetchReactions,
  };
};
