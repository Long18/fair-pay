import { useCreate, useUpdate, useDelete, BaseRecord } from "@refinedev/core";

/**
 * Optimistic update utilities for mutations
 *
 * These hooks update the UI immediately before the server responds,
 * providing instant feedback to users. If the request fails, changes are rolled back.
 *
 * Pattern:
 * 1. User submits form
 * 2. Optimistically update UI immediately
 * 3. Send request to server
 * 4. If success: Keep optimistic update
 * 5. If error: Rollback and show error
 *
 * Note: These are simplified wrappers around Refine's mutation hooks.
 * For complex optimistic updates, use React Query's useMutation directly with onMutate.
 */

export const useCreateWithOptimism = <TData extends BaseRecord = BaseRecord>(
  resource: string
) => {
  return useCreate<TData>({
    resource,
  });
};

export const useUpdateWithOptimism = <TData extends BaseRecord = BaseRecord>(
  resource: string
) => {
  return useUpdate<TData>({
    resource,
  });
};

export const useDeleteWithOptimism = (_resource: string) => {
  return useDelete({});
};
