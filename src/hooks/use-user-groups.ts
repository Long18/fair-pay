import { useQuery } from "@tanstack/react-query";

import { supabaseClient } from "@/utility/supabaseClient";

export interface GroupAffiliation {
  id: string;
  name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  joined_at: string;
}

interface RpcRow {
  user_id: string;
  group_id: string;
  group_name: string;
  group_avatar_url: string | null;
  role: "admin" | "member";
  joined_at: string;
}

const STALE_TIME = 2 * 60 * 1000;

function normalizeIds(userIds: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const id of userIds) {
    if (id) seen.add(id);
  }
  return Array.from(seen).sort();
}

async function fetchUsersGroups(userIds: string[]): Promise<Map<string, GroupAffiliation[]>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabaseClient.rpc("get_users_groups", {
    p_user_ids: userIds,
  });

  if (error) throw error;

  const result = new Map<string, GroupAffiliation[]>();
  for (const id of userIds) result.set(id, []);

  for (const row of (data ?? []) as RpcRow[]) {
    const list = result.get(row.user_id) ?? [];
    list.push({
      id: row.group_id,
      name: row.group_name,
      avatar_url: row.group_avatar_url,
      role: row.role,
      joined_at: row.joined_at,
    });
    result.set(row.user_id, list);
  }

  return result;
}

export function useUserGroupsBatch(userIds: ReadonlyArray<string | null | undefined>) {
  const ids = normalizeIds(userIds);

  return useQuery({
    queryKey: ["user-groups-batch", ids],
    queryFn: () => fetchUsersGroups(ids),
    enabled: ids.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useUserGroups(userId: string | null | undefined) {
  const batch = useUserGroupsBatch(userId ? [userId] : []);

  return {
    data: userId ? batch.data?.get(userId) ?? [] : [],
    isLoading: !!userId && batch.isLoading,
    isError: batch.isError,
    error: batch.error,
  };
}
