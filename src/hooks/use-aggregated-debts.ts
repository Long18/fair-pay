import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState, useCallback } from "react";

export interface AggregatedDebt {
    counterparty_id: string;
    counterparty_name: string;
    counterparty_avatar_url?: string;
    amount: number;
    currency: string;
    i_owe_them: boolean;
    owed_to_name?: string; // Name of person who is owed (for public demo data)
    owed_to_id?: string; // ID of person who is owed (for public demo data)
    total_amount?: number; // Total amount ever owed (for historical mode)
    settled_amount?: number; // Amount already settled (for historical mode)
    remaining_amount?: number; // Amount still outstanding (for historical mode)
    transaction_count?: number; // Number of transactions (for historical mode)
    last_transaction_date?: string; // Last transaction date (for historical mode)
}

export interface UseAggregatedDebtsOptions {
    includeHistory?: boolean; // If true, includes settled debts in results
}

/**
 * Hook to fetch aggregated debts
 * - For authenticated users: Fetches their real debt data using get_user_debts_aggregated or get_user_debts_history
 * - For unauthenticated users: Fetches public demo data using get_public_demo_debts
 * - All data comes from database, no hardcoded sample data
 *
 * @param options.includeHistory - If true, fetches all historical debts including settled ones
 */
export const useAggregatedDebts = (options: UseAggregatedDebtsOptions = {}) => {
    const { includeHistory = false } = options;
    const { data: identity } = useGetIdentity<Profile>();
    const [data, setData] = useState<AggregatedDebt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchDebts = useCallback(async () => {
        setIsLoading(true);
        try {
            let result;
            let rpcError;

            if (!identity?.id) {
                // Unauthenticated: Fetch real data but with amounts hidden
                const response = await supabaseClient.rpc("get_user_debts_public");
                result = response.data;
                rpcError = response.error;
                
                // For unauthorized users, ensure amounts stay hidden
                if (result) {
                    result = result.map((debt: any) => ({
                        ...debt,
                        amount: 0, // Hide actual amounts for privacy
                        display_amount: "Hidden", // Add display field for UI
                        is_public_view: true
                    }));
                }
            } else {
                // Authenticated: Fetch user's real data
                const functionName = includeHistory
                    ? "get_user_debts_history"
                    : "get_user_debts_aggregated";

                const response = await supabaseClient.rpc(
                    functionName,
                    {
                        p_user_id: identity.id,
                    }
                );
                result = response.data;
                rpcError = response.error;

                // For authenticated users, show real data only (no demo fallback)
                // This ensures users see their actual debts, even if empty
            }

            if (rpcError) {
                console.error("Error fetching debts:", rpcError);
                throw rpcError;
            }

            // Fetch avatar_urls from profiles table and add currency fallback
            const debts = result || [];
            if (debts.length > 0) {
                const counterpartyIds = debts.map((d: { counterparty_id: string }) => d.counterparty_id).filter(Boolean);
                if (counterpartyIds.length > 0) {
                    const { data: profiles } = await supabaseClient
                        .from("profiles")
                        .select("id, avatar_url")
                        .in("id", counterpartyIds);

                    // Map avatar_url to debts
                    const profileMap = new Map(
                        (profiles || []).map((p: { id: string; avatar_url: string }) => [p.id, p.avatar_url])
                    );
                    debts.forEach((debt: { counterparty_id: string; counterparty_avatar_url?: string; currency?: string }) => {
                        debt.counterparty_avatar_url = profileMap.get(debt.counterparty_id);
                        // Keep currency from database, don't override
                    });
                }
            }

            setData(debts);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch debts:", err);
            setData([]);
            setError(err instanceof Error ? err : new Error("Unknown error"));
        } finally {
            setIsLoading(false);
        }
    }, [identity?.id, includeHistory]);

    useEffect(() => {
        fetchDebts();
    }, [fetchDebts]);

    // Real-time subscription to refetch when expenses or splits change
    useEffect(() => {
        if (!identity?.id) return;

        console.log('Setting up real-time subscriptions for user:', identity.id);

        // Subscribe to changes in expenses table
        const expensesChannel = supabaseClient
            .channel('expenses-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'expenses',
                },
                (payload) => {
                    console.log('Expense changed, refetching debts...', payload);
                    fetchDebts();
                }
            )
            .subscribe((status) => {
                console.log('Expenses subscription status:', status);
            });

        // Subscribe to changes in expense_splits table
        const splitsChannel = supabaseClient
            .channel('expense-splits-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'expense_splits',
                },
                (payload) => {
                    console.log('Expense split changed, refetching debts...', payload);
                    fetchDebts();
                }
            )
            .subscribe((status) => {
                console.log('Expense splits subscription status:', status);
            });

        // Cleanup subscriptions on unmount
        return () => {
            console.log('Cleaning up real-time subscriptions');
            supabaseClient.removeChannel(expensesChannel);
            supabaseClient.removeChannel(splitsChannel);
        };
    }, [identity?.id, fetchDebts]);

    return { data, isLoading, error, refetch: fetchDebts };
};
