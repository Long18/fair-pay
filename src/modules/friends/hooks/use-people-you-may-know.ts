import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";

export type PeopleYouMayKnowItem = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  mutual_count: number;
};

export function usePeopleYouMayKnow(enabled: boolean, limit = 20) {
  const queryClient = useQueryClient();
  const queryKey = ["people-you-may-know", limit] as const;

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<PeopleYouMayKnowItem[]> => {
      const { data, error } = await supabaseClient.rpc("get_people_you_may_know", {
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as PeopleYouMayKnowItem[];
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (suggestedUserId: string) => {
      const { data: auth } = await supabaseClient.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const { error } = await supabaseClient.from("friend_suggestion_dismissals").insert({
        user_id: uid,
        suggested_user_id: suggestedUserId,
      });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["people-you-may-know"] });
    },
  });

  const dismiss = useCallback(
    (suggestedUserId: string) => dismissMutation.mutateAsync(suggestedUserId),
    [dismissMutation],
  );

  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    dismiss,
    isDismissing: dismissMutation.isPending,
  };
}
