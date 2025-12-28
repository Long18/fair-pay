import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState, useCallback } from "react";

export interface AggregatedDebt {
    counterparty_id: string;
    counterparty_name: string;
    counterparty_avatar_url?: string;
    amount: number;
    i_owe_them: boolean;
    owed_to_name?: string; // Name of person who is owed (for public demo data)
    owed_to_id?: string; // ID of person who is owed (for public demo data)
}

/**
 * Hook to fetch aggregated debts
 * - For authenticated users: Fetches their real debt data using get_user_debts_aggregated
 * - For unauthenticated users: Fetches public demo data using get_public_demo_debts
 * - All data comes from database, no hardcoded sample data
 */
export const useAggregatedDebts = () => {
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
                // Unauthenticated: Fetch public demo data from database
                const response = await supabaseClient.rpc("get_public_demo_debts");
                result = response.data;
                rpcError = response.error;
            } else {
                // Authenticated: Fetch user's real data
                const response = await supabaseClient.rpc(
                    "get_user_debts_aggregated",
                    {
                        p_user_id: identity.id,
                    }
                );
                result = response.data;
                rpcError = response.error;

                // If authenticated but no real data, fallback to demo data for better UX
                if (!rpcError && (!result || result.length === 0)) {
                    const demoResponse = await supabaseClient.rpc("get_public_demo_debts");
                    if (!demoResponse.error) {
                        result = demoResponse.data;
                    }
                }
            }

            if (rpcError) {
                console.error("Error fetching debts:", rpcError);
                throw rpcError;
            }

            // Fetch avatar_urls from profiles table
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
                    debts.forEach((debt: { counterparty_id: string; counterparty_avatar_url?: string }) => {
                        debt.counterparty_avatar_url = profileMap.get(debt.counterparty_id);
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
    }, [identity?.id]);

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
