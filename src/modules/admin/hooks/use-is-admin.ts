import { useGetIdentity } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";

/**
 * Hook to check if the current user has admin role.
 * Queries `user_roles` table and caches the result via React Query.
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { data: identity, isLoading: identityLoading } =
    useGetIdentity<Profile>();

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["user_roles", "is_admin", identity?.id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", identity!.id)
        .single();

      if (error || !data) return false;
      return data.role === "admin";
    },
    enabled: !!identity?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading: identityLoading || (!!identity?.id && roleLoading),
  };
}
