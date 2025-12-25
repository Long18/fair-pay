import { useList, useGetIdentity } from "@refinedev/core";
import { useMemo } from "react";
import { useBalanceCalculation } from "@/modules/payments";
import { Profile } from "@/modules/profile/types";

export interface GroupBalance {
  group_id: string;
  group_name: string;
  my_balance: number; // Positive = others owe me, Negative = I owe others
  member_count: number;
}

export interface GlobalBalance {
  total_owed_to_me: number;
  total_i_owe: number;
  net_balance: number;
  group_balances: GroupBalance[];
  isLoading: boolean;
}

/**
 * Calculate global balance across all groups user is a member of
 *
 * Aggregates balances from all groups and provides:
 * - Total amount others owe the user
 * - Total amount user owes others
 * - Net balance (positive = owed to user, negative = user owes)
 * - Per-group balance breakdown
 */
export const useGlobalBalance = (): GlobalBalance => {
  const { data: identity } = useGetIdentity<Profile>();

  // Fetch all groups user is a member of
  const { query: groupMembersQuery } = useList({
    resource: "group_members",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    meta: {
      select: "*, groups:group_id(id, name)",
    },
    pagination: {
      mode: "off",
    },
  });

  const myGroups = (groupMembersQuery.data?.data || []).map((gm: any) => ({
    id: gm.groups?.id,
    name: gm.groups?.name,
  }));

  // Fetch all expenses across all groups
  const { query: expensesQuery } = useList({
    resource: "expenses",
    filters: myGroups.length > 0 ? [
      {
        field: "group_id",
        operator: "in",
        value: myGroups.map(g => g.id),
      },
    ] : [],
    meta: {
      select: "*, expense_splits:expense_id(*)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: myGroups.length > 0,
    },
  });

  // Fetch all payments across all groups
  const { query: paymentsQuery } = useList({
    resource: "payments",
    filters: myGroups.length > 0 ? [
      {
        field: "group_id",
        operator: "in",
        value: myGroups.map(g => g.id),
      },
    ] : [],
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: myGroups.length > 0,
    },
  });

  // Fetch all group members for balance calculations
  const { query: allMembersQuery } = useList({
    resource: "group_members",
    filters: myGroups.length > 0 ? [
      {
        field: "group_id",
        operator: "in",
        value: myGroups.map(g => g.id),
      },
    ] : [],
    meta: {
      select: "*, profiles:user_id(id, full_name, avatar_url)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: myGroups.length > 0,
    },
  });

  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];
  const allMembers: any[] = allMembersQuery.data?.data || [];

  // Calculate balances per group
  const globalBalance = useMemo(() => {
    if (!identity?.id || myGroups.length === 0) {
      return {
        total_owed_to_me: 0,
        total_i_owe: 0,
        net_balance: 0,
        group_balances: [],
        isLoading: groupMembersQuery.isLoading,
      };
    }

    const groupBalances: GroupBalance[] = myGroups.map(group => {
      // Filter data for this specific group
      const groupExpenses = expenses.filter(e => e.group_id === group.id);
      const groupPayments = payments.filter(p => p.group_id === group.id);
      const groupMembers = allMembers
        .filter(m => m.group_id === group.id)
        .map((m: any) => ({
          id: m.user_id,
          full_name: m.profiles?.full_name || "Unknown",
          avatar_url: m.profiles?.avatar_url,
        }));

      // Calculate balances for this group using existing hook logic
      const balances = useBalanceCalculation({
        expenses: groupExpenses,
        payments: groupPayments,
        currentUserId: identity.id,
        members: groupMembers,
      });

      // Find current user's balance in this group
      const myBalance = balances.find(b => b.user_id === identity.id);

      return {
        group_id: group.id,
        group_name: group.name,
        my_balance: myBalance?.balance || 0,
        member_count: groupMembers.length,
      };
    });

    // Calculate totals
    let total_owed_to_me = 0;
    let total_i_owe = 0;

    groupBalances.forEach(gb => {
      if (gb.my_balance > 0) {
        total_owed_to_me += gb.my_balance;
      } else if (gb.my_balance < 0) {
        total_i_owe += Math.abs(gb.my_balance);
      }
    });

    const net_balance = total_owed_to_me - total_i_owe;

    return {
      total_owed_to_me: Math.round(total_owed_to_me * 100) / 100,
      total_i_owe: Math.round(total_i_owe * 100) / 100,
      net_balance: Math.round(net_balance * 100) / 100,
      group_balances: groupBalances,
      isLoading: groupMembersQuery.isLoading || expensesQuery.isLoading || paymentsQuery.isLoading,
    };
  }, [identity, myGroups, expenses, payments, allMembers, groupMembersQuery.isLoading, expensesQuery.isLoading, paymentsQuery.isLoading]);

  return globalBalance;
};
