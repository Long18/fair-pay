import { useList, useGetIdentity } from "@refinedev/core";
import { useMemo } from "react";
import { useBalanceCalculation, Payment } from "@/modules/payments";
import { Profile } from "@/modules/profile/types";
import { ExpenseWithSplits } from "@/modules/expenses";

export interface LeaderboardUser {
    id: string;
    name: string;
    avatar_url: string | null;
    balance: number;
    rank: number;
    badge?: "gold" | "silver" | "bronze";
}

export interface PublicStats {
    total_users: number;
    total_groups: number;
    total_transactions: number;
    total_amount_tracked: number;
}

export const useSampleLeaderboard = () => {
    const { data: identity } = useGetIdentity<Profile>();

    const { query: profilesQuery } = useList({
        resource: "profiles",
        pagination: { mode: "off" },
    });

    const { query: groupsQuery } = useList({
        resource: "groups",
        pagination: { mode: "off" },
    });

    const { query: groupMembersQuery } = useList({
        resource: "group_members",
        pagination: { mode: "off" },
        meta: {
            select: "*, profiles!user_id(id, full_name, avatar_url)",
        },
    });

    const { query: expensesQuery } = useList({
        resource: "expenses",
        pagination: { mode: "off" },
        meta: {
            select: "*, expense_splits!expense_id(*)",
        },
    });

    const { query: paymentsQuery } = useList({
        resource: "payments",
        pagination: { mode: "off" },
    });

    const profiles = profilesQuery.data?.data || [];
    const groups = groupsQuery.data?.data || [];
    const groupMembers = groupMembersQuery.data?.data || [];
    const expenses = expensesQuery.data?.data || [];
    const payments = paymentsQuery.data?.data || [];

    const { topDebtors, topCreditors, stats } = useMemo(() => {
        const allGroupIds = groups.map((g: any) => g.id);

        const userBalances = new Map<string, {
            user_id: string;
            user_name: string;
            avatar_url: string | null;
            balance: number
        }>();

        allGroupIds.forEach((groupId: string) => {
            const groupExpenses = expenses.filter((e: any) => e.group_id === groupId);
            const groupPayments = payments.filter((p: any) => p.group_id === groupId);
            const members = groupMembers
                .filter((m: any) => m.group_id === groupId)
                .map((m: any) => ({
                    id: m.user_id,
                    full_name: m.profiles?.full_name || "Unknown",
                    avatar_url: m.profiles?.avatar_url,
                }));

            if (members.length === 0) return;

            const balances = useBalanceCalculation({
                expenses: groupExpenses as ExpenseWithSplits[],
                payments: groupPayments as Payment[],
                currentUserId: identity?.id || "",
                members,
            });

            balances.forEach((b) => {
                const existing = userBalances.get(b.user_id);
                if (existing) {
                    existing.balance += b.balance;
                } else {
                    userBalances.set(b.user_id, {
                        user_id: b.user_id,
                        user_name: b.user_name,
                        avatar_url: b.avatar_url,
                        balance: b.balance,
                    });
                }
            });
        });

        const allBalances = Array.from(userBalances.values());

        const debtors = allBalances
            .filter((b) => b.balance < 0)
            .sort((a, b) => a.balance - b.balance)
            .slice(0, 5)
            .map((b, index) => ({
                id: b.user_id,
                name: b.user_name,
                avatar_url: b.avatar_url,
                balance: b.balance,
                rank: index + 1,
                badge: index === 0 ? "gold" as const : index === 1 ? "silver" as const : index === 2 ? "bronze" as const : undefined,
            }));

        const creditors = allBalances
            .filter((b) => b.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5)
            .map((b, index) => ({
                id: b.user_id,
                name: b.user_name,
                avatar_url: b.avatar_url,
                balance: b.balance,
                rank: index + 1,
                badge: index === 0 ? "gold" as const : index === 1 ? "silver" as const : index === 2 ? "bronze" as const : undefined,
            }));

        const totalAmountTracked = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

        return {
            topDebtors: debtors,
            topCreditors: creditors,
            stats: {
                total_users: profiles.length,
                total_groups: groups.length,
                total_transactions: expenses.length + payments.length,
                total_amount_tracked: Math.round(totalAmountTracked),
            },
        };
    }, [profiles, groups, groupMembers, expenses, payments, identity]);

    return {
        topDebtors,
        topCreditors,
        stats,
    };
};
