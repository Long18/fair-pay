import { useList, useGetIdentity } from "@refinedev/core";
import { useMemo, useEffect, useState } from "react";
import { Profile } from "@/modules/profile/types";
import { supabaseClient } from "@/utility/supabaseClient";

export type ActivityType = "expense" | "payment";

export interface ActivityItem {
    id: string;
    type: ActivityType;
    description: string;
    amount: number;
    currency: string;
    date: string;
    group_id?: string;
    group_name?: string;
    created_by_id: string;
    created_by_name: string;
    created_by_avatar_url?: string;
    is_mine: boolean; // Whether current user created this activity
}

export interface RecentActivity {
    items: ActivityItem[];
    isLoading: boolean;
    isRefetching?: boolean;
}

// Removed SAMPLE_ACTIVITIES - now always query real data from database

/**
 * Fetch and merge recent expenses and payments into a unified activity feed
 *
 * - For authenticated users: Query their real expenses and payments
 * - For unauthenticated users: Query public activities via RPC function
 */
export const useRecentActivity = (limit: number = 20): RecentActivity => {
    const { data: identity } = useGetIdentity<Profile>();
    const [publicActivities, setPublicActivities] = useState<ActivityItem[]>([]);
    const [isLoadingPublic, setIsLoadingPublic] = useState(false);

    // For unauthenticated users, fetch public activities
    useEffect(() => {
        if (!identity?.id) {
            setIsLoadingPublic(true);
            supabaseClient
                .rpc("get_public_recent_activities", { p_limit: limit })
                .then(({ data, error }) => {
                    if (error) {
                        console.error("Error fetching public activities:", error);
                        setPublicActivities([]);
                    } else {
                        const activities: ActivityItem[] = (data || []).map((item: any) => ({
                            id: item.id,
                            type: item.type as ActivityType,
                            description: item.description,
                            amount: item.amount,
                            currency: item.currency || "VND",
                            date: item.date,
                            group_id: item.group_id,
                            group_name: item.group_name,
                            created_by_id: item.created_by_id,
                            created_by_name: item.created_by_name || "Unknown",
                            created_by_avatar_url: item.created_by_avatar_url,
                            is_mine: false,
                        }));
                        setPublicActivities(activities);
                    }
                    setIsLoadingPublic(false);
                });
        }
    }, [identity?.id, limit]);

    // Fetch recent expenses
    const { query: expensesQuery } = useList({
        resource: "expenses",
        pagination: {
            pageSize: limit,
        },
        sorters: [
            {
                field: "created_at",
                order: "desc",
            },
        ],
        meta: {
            select: "*, groups!group_id(id, name), profiles!created_by(id, full_name, avatar_url)",
        },
        queryOptions: {
            // Only fetch if authenticated
            enabled: !!identity?.id,
        },
    });

    // Fetch recent payments
    const { query: paymentsQuery } = useList({
        resource: "payments",
        pagination: {
            pageSize: limit,
        },
        sorters: [
            {
                field: "created_at",
                order: "desc",
            },
        ],
        meta: {
            select: "*, groups!group_id(id, name), profiles!created_by(id, full_name, avatar_url), from_profile:profiles!from_user(full_name), to_profile:profiles!to_user(full_name)",
        },
        queryOptions: {
            // Only fetch if authenticated
            enabled: !!identity?.id,
        },
    });

    const expenses: any[] = expensesQuery.data?.data || [];
    const payments: any[] = paymentsQuery.data?.data || [];

    const activity = useMemo(() => {
        // For unauthenticated users, return public activities
        if (!identity?.id) {
            return {
                items: publicActivities,
                isLoading: isLoadingPublic,
                isRefetching: false,
            };
        }

        // For authenticated users, merge their expenses and payments
        const safeExpenses = Array.isArray(expenses) ? expenses : [];
        const safePayments = Array.isArray(payments) ? payments : [];

        // Transform expenses into activity items
        const expenseItems: ActivityItem[] = safeExpenses.map(expense => ({
            id: expense.id,
            type: "expense" as const,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency || "VND",
            date: expense.created_at,
            group_id: expense.group_id,
            group_name: expense.groups?.name,
            created_by_id: expense.created_by,
            created_by_name: expense.profiles?.full_name || "Unknown",
            created_by_avatar_url: expense.profiles?.avatar_url,
            is_mine: identity?.id ? expense.created_by === identity.id : false,
        }));

        // Transform payments into activity items
        const paymentItems: ActivityItem[] = safePayments.map(payment => ({
            id: payment.id,
            type: "payment" as const,
            description: `${payment.from_profile?.full_name || "Unknown"} paid ${payment.to_profile?.full_name || "Unknown"}`,
            amount: payment.amount,
            currency: payment.currency || "VND",
            date: payment.created_at,
            group_id: payment.group_id,
            group_name: payment.groups?.name,
            created_by_id: payment.created_by,
            created_by_name: payment.profiles?.full_name || "Unknown",
            created_by_avatar_url: payment.profiles?.avatar_url,
            is_mine: identity?.id ? payment.created_by === identity.id : false,
        }));

        // Merge and sort by date
        const allItems = [...expenseItems, ...paymentItems].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        return {
            items: allItems.slice(0, limit),
            isLoading: expensesQuery.isLoading || paymentsQuery.isLoading,
            isRefetching: expensesQuery.isRefetching || paymentsQuery.isRefetching,
        };
    }, [identity, publicActivities, isLoadingPublic, expenses, payments, limit, expensesQuery.isLoading, paymentsQuery.isLoading, expensesQuery.isRefetching, paymentsQuery.isRefetching]);

    return activity;
};
