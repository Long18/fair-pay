import { useList, useGetIdentity } from "@refinedev/core";
import { useMemo } from "react";
import { Profile } from "@/modules/profile/types";

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
    is_mine: boolean; // Whether current user created this activity
}

export interface RecentActivity {
    items: ActivityItem[];
    isLoading: boolean;
    isRefetching?: boolean;
}

/**
 * Sample activity data for when database is empty or unauthenticated
 */
const SAMPLE_ACTIVITIES: ActivityItem[] = [
    {
        id: "sample-1",
        type: "expense",
        description: "Lunch at Pizza Place",
        amount: 450000,
        currency: "VND",
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        group_name: "Weekend Trip",
        created_by_id: "demo-user-1",
        created_by_name: "John",
        is_mine: false,
    },
    {
        id: "sample-2",
        type: "payment",
        description: "Sarah paid Mike",
        amount: 200000,
        currency: "VND",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        created_by_id: "demo-user-2",
        created_by_name: "Sarah",
        is_mine: false,
    },
    {
        id: "sample-3",
        type: "expense",
        description: "Movie tickets",
        amount: 300000,
        currency: "VND",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        group_name: "Friends",
        created_by_id: "demo-user-3",
        created_by_name: "Emma",
        is_mine: false,
    },
];

/**
 * Fetch and merge recent expenses and payments into a unified activity feed
 *
 * Returns the 20 most recent activities (expenses + payments) sorted by date
 */
export const useRecentActivity = (limit: number = 20): RecentActivity => {
    const { data: identity } = useGetIdentity<Profile>();

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
            select: "*, groups!group_id(id, name), profiles!created_by(id, full_name)",
        },
        queryOptions: {
            // Only fetch if authenticated, otherwise show sample data
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
            select: "*, groups!group_id(id, name), profiles!created_by(id, full_name), from_profile:profiles!from_user(full_name), to_profile:profiles!to_user(full_name)",
        },
        queryOptions: {
            // Only fetch if authenticated, otherwise show sample data
            enabled: !!identity?.id,
        },
    });

    const expenses: any[] = expensesQuery.data?.data || [];
    const payments: any[] = paymentsQuery.data?.data || [];

    const activity = useMemo(() => {
        // If not authenticated, show sample data immediately
        if (!identity?.id) {
            return {
                items: SAMPLE_ACTIVITIES,
                isLoading: false,
                isRefetching: false,
            };
        }

        // Ensure we have valid arrays to work with
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
            is_mine: identity?.id ? payment.created_by === identity.id : false,
        }));

        // Merge and sort by date
        const allItems = [...expenseItems, ...paymentItems].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // If authenticated but no real data, use sample activities for demo purposes
        const items = allItems.length > 0 ? allItems.slice(0, limit) : SAMPLE_ACTIVITIES;

        return {
            items,
            isLoading: expensesQuery.isLoading || paymentsQuery.isLoading,
            isRefetching: expensesQuery.isRefetching || paymentsQuery.isRefetching,
        };
    }, [identity, expenses, payments, limit, expensesQuery.isLoading, paymentsQuery.isLoading, expensesQuery.isRefetching, paymentsQuery.isRefetching]);

    return activity;
};
