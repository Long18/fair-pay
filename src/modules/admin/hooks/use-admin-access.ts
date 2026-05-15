import { useGetIdentity } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import type { Profile } from "@/modules/profile/types";
import { getAdminCapabilities, normalizeAppRole, type AppRole, type AdminCapabilities } from "../access";

interface UseAdminAccessResult extends AdminCapabilities {
  role: AppRole;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  isLoading: boolean;
}

export function useAdminAccess(): UseAdminAccessResult {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Profile>();

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["user_roles", "current_role", identity?.id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", identity!.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading current user role:", error);
        return "user";
      }

      return normalizeAppRole(data?.role);
    },
    enabled: !!identity?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const resolvedRole = role ?? "user";
  const capabilities = getAdminCapabilities(resolvedRole);

  return {
    role: resolvedRole,
    isAdmin: resolvedRole === "admin",
    isModerator: resolvedRole === "moderator",
    isStaff: capabilities.canEnterAdmin,
    isLoading: identityLoading || (!!identity?.id && roleLoading),
    ...capabilities,
  };
}
