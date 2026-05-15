import { useAdminAccess } from "./use-admin-access";

/**
 * Hook to check if the current user has admin role.
 * Queries `user_roles` table and caches the result via React Query.
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { isAdmin, isLoading } = useAdminAccess();

  return {
    isAdmin,
    isLoading,
  };
}
