import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { collectAuditEntityIds } from "./audit-collect-entity-ids";

export type AuditUserRef = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type AuditGroupRef = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type AuditExpenseRef = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  expense_date: string;
  group_id: string | null;
};

export type AuditSplitRef = {
  id: string;
  user_id: string;
  expense_id: string;
  group_id: string | null;
  amount: number;
  remaining_amount: number | null;
  is_settled: boolean;
};

export type AuditEntityMaps = {
  users: Map<string, AuditUserRef>;
  groups: Map<string, AuditGroupRef>;
  expenses: Map<string, AuditExpenseRef>;
  splits: Map<string, AuditSplitRef>;
};

const emptyMaps: AuditEntityMaps = {
  users: new Map(),
  groups: new Map(),
  expenses: new Map(),
  splits: new Map(),
};

export function useAuditEntities({
  enabled,
  oldData,
  newData,
  metadata,
  tableName,
  entityId,
}: {
  enabled: boolean;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  tableName?: string | null;
  entityId?: string | null;
}) {
  const buckets = useMemo(
    () =>
      collectAuditEntityIds([oldData, newData, metadata], {
        tableName,
        entityId,
      }),
    [oldData, newData, metadata, tableName, entityId],
  );

  const queryKey = [
    "audit-entity-refs",
    buckets.userIds.join(","),
    buckets.groupIds.join(","),
    buckets.expenseIds.join(","),
    buckets.splitIds.join(","),
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled:
      enabled &&
      (buckets.userIds.length > 0 ||
        buckets.groupIds.length > 0 ||
        buckets.expenseIds.length > 0 ||
        buckets.splitIds.length > 0),
    staleTime: 60_000,
    queryFn: async (): Promise<AuditEntityMaps> => {
      const users = new Map<string, AuditUserRef>();
      const groups = new Map<string, AuditGroupRef>();
      const expenses = new Map<string, AuditExpenseRef>();
      const splits = new Map<string, AuditSplitRef>();

      const userIds = [...buckets.userIds];
      const groupIds = [...buckets.groupIds];
      const expenseIds = [...buckets.expenseIds];

      if (buckets.splitIds.length > 0) {
        const { data: splitRows, error } = await supabaseClient
          .from("expense_splits")
          .select("id, user_id, expense_id, computed_amount, settled_amount, is_settled")
          .in("id", buckets.splitIds);
        if (error) throw error;
        for (const row of splitRows ?? []) {
          const settled = row.settled_amount ?? 0;
          const computed = row.computed_amount ?? 0;
          splits.set(row.id, {
            id: row.id,
            user_id: row.user_id,
            expense_id: row.expense_id,
            group_id: null,
            amount: computed,
            remaining_amount: computed - settled,
            is_settled: row.is_settled ?? false,
          });
          if (!userIds.includes(row.user_id)) userIds.push(row.user_id);
          if (!expenseIds.includes(row.expense_id)) expenseIds.push(row.expense_id);
        }
      }

      if (userIds.length > 0) {
        const { data: rows, error } = await supabaseClient
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        if (error) throw error;
        for (const row of rows ?? []) users.set(row.id, row);
      }

      if (groupIds.length > 0) {
        const { data: rows, error } = await supabaseClient
          .from("groups")
          .select("id, name, avatar_url")
          .in("id", groupIds);
        if (error) throw error;
        for (const row of rows ?? []) groups.set(row.id, row);
      }

      if (expenseIds.length > 0) {
        const { data: rows, error } = await supabaseClient
          .from("expenses")
          .select("id, description, amount, currency, category, expense_date, group_id")
          .in("id", expenseIds);
        if (error) throw error;
        for (const row of rows ?? []) expenses.set(row.id, row);
        const extraGroupIds = [
          ...new Set(
            (rows ?? [])
              .map((r) => r.group_id)
              .filter((id): id is string => Boolean(id) && !groups.has(id)),
          ),
        ];
        if (extraGroupIds.length > 0) {
          const { data: groupRows, error } = await supabaseClient
            .from("groups")
            .select("id, name, avatar_url")
            .in("id", extraGroupIds);
          if (error) throw error;
          for (const row of groupRows ?? []) groups.set(row.id, row);
        }
      }

      return { users, groups, expenses, splits };
    },
  });

  return {
    entities: data ?? emptyMaps,
    isLoadingEntities: isLoading,
  };
}

export type AuditEntityHints = {
  users?: Array<{
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  }>;
  groups?: Array<{ id: string; name?: string; avatar_url?: string | null }>;
  expenses?: Array<{
    id: string;
    description?: string;
    amount?: number;
    currency?: string;
    category?: string | null;
    expense_date?: string;
    group_id?: string | null;
  }>;
};

export function enrichAuditEntityMaps(
  maps: AuditEntityMaps,
  hints?: AuditEntityHints | null,
): AuditEntityMaps {
  if (!hints) return maps;

  const users = new Map(maps.users);
  for (const hint of hints.users ?? []) {
    const existing = users.get(hint.id);
    users.set(hint.id, {
      id: hint.id,
      full_name: hint.full_name ?? existing?.full_name ?? null,
      avatar_url: hint.avatar_url ?? existing?.avatar_url ?? null,
    });
  }

  const groups = new Map(maps.groups);
  for (const hint of hints.groups ?? []) {
    const existing = groups.get(hint.id);
    if (!hint.name && !existing) continue;
    groups.set(hint.id, {
      id: hint.id,
      name: hint.name ?? existing?.name ?? "",
      avatar_url: hint.avatar_url ?? existing?.avatar_url ?? null,
    });
  }

  const expenses = new Map(maps.expenses);
  for (const hint of hints.expenses ?? []) {
    const existing = expenses.get(hint.id);
    if (!hint.description && !existing) continue;
    expenses.set(hint.id, {
      id: hint.id,
      description: hint.description ?? existing?.description ?? "",
      amount: hint.amount ?? existing?.amount ?? 0,
      currency: hint.currency ?? existing?.currency ?? "VND",
      category: hint.category ?? existing?.category ?? null,
      expense_date: hint.expense_date ?? existing?.expense_date ?? new Date().toISOString(),
      group_id: hint.group_id ?? existing?.group_id ?? null,
    });
  }

  return { users, groups, expenses, splits: maps.splits };
}
