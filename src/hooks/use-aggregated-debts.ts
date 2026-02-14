import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState, useCallback, useRef } from "react";
import { onSettlementEvent } from "@/lib/settlement-events";

export interface AggregatedDebt {
    counterparty_id: string | null; // NULL for pending email participants
    counterparty_name: string;
    counterparty_avatar_url?: string;
    counterparty_email?: string; // Email for pending (unregistered) participants
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
    dateRange?: { start: Date; end: Date };
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
    const { includeHistory = false, dateRange } = options;
    const { data: identity, isLoading: identityLoading } = useGetIdentity<Profile>();
    const [data, setData] = useState<AggregatedDebt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchDebts = useCallback(async () => {
        // Wait for identity to finish loading before deciding which path to take
        // This prevents showing public demo data while auth state is still resolving
        if (identityLoading) {
            return;
        }

        setIsLoading(true);
        try {
            let result;
            let rpcError;

            if (!identity?.id) {
                // Unauthenticated: Fetch public data with admin email configuration
                const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
                const response = await supabaseClient.rpc("get_user_debts_public", {
                    p_admin_email: adminEmail || null
                });
                result = response.data;
                rpcError = response.error;
            } else {
                // Authenticated: Check if user is involved in any expenses
                // Check as split participant OR as payer
                const [splitCheck, payerCheck] = await Promise.all([
                    supabaseClient
                        .from("expense_splits")
                        .select("id", { count: "exact", head: true })
                        .eq("user_id", identity.id),
                    supabaseClient
                        .from("expenses")
                        .select("id", { count: "exact", head: true })
                        .eq("paid_by_user_id", identity.id),
                ]);

                const countError = splitCheck.error || payerCheck.error;
                const splitCount = (splitCheck.count || 0) + (payerCheck.count || 0);

                if (countError) {
                    console.error("Error checking expense splits:", countError);
                    rpcError = countError;
                    result = [];
                } else if (!splitCount || splitCount === 0) {
                    // User has no expense splits, return empty debts immediately
                    result = [];
                    rpcError = null;
                } else {
                    // Authenticated: Fetch user's real data only if they have splits
                    const functionName = includeHistory
                        ? "get_user_debts_history"
                        : "get_user_debts_aggregated";

                    const rpcParams: Record<string, string> = { p_user_id: identity.id };
                    if (dateRange) {
                        rpcParams.p_start_date = dateRange.start.toISOString();
                        rpcParams.p_end_date = dateRange.end.toISOString();
                    }

                    const response = await supabaseClient.rpc(
                        functionName,
                        rpcParams
                    );
                    result = response.data;
                    rpcError = response.error;
                }

                // For authenticated users, show real data only (no demo fallback)
                // This ensures users see their actual debts, even if empty
            }

            if (rpcError) {
                console.error("Error fetching debts:", rpcError);
                throw rpcError;
            }

            // Fetch avatar_urls from profiles table and add currency fallback
            let debts = result || [];

            // Filter out fully settled debts when includeHistory is false
            if (!includeHistory) {
                debts = debts.filter((debt: any) => {
                    // Filter out debts with amount = 0 or remaining_amount = 0
                    const amount = Number(debt.amount || 0);
                    const remainingAmount = Number(debt.remaining_amount || debt.amount || 0);
                    return amount !== 0 && remainingAmount !== 0;
                });
            }

            if (debts.length > 0) {
                const counterpartyIds = debts
                    .map((d: { counterparty_id: string }) => d.counterparty_id)
                    .filter((id: string) => id != null && id !== '');
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
    }, [identity?.id, identityLoading, includeHistory, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()]);

    // Debounced version of fetchDebts for real-time subscriptions
    // Use useRef to maintain a stable reference to avoid infinite loops
    const fetchDebtsRef = useRef(fetchDebts);
    fetchDebtsRef.current = fetchDebts;

    const debouncedFetchDebts = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            fetchDebtsRef.current();
        }, 200); // 200ms debounce for faster UI updates after settlement
    }, []); // No dependencies to prevent recreation

    useEffect(() => {
        fetchDebts();
    }, [fetchDebts]);

    // Real-time subscription to refetch when expenses or splits change
    useEffect(() => {
        if (!identity?.id) return;

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
                (_payload) => {
                    debouncedFetchDebts();
                }
            )
            .subscribe((_status) => {
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
                (_payload) => {
                    debouncedFetchDebts();
                }
            )
            .subscribe((_status) => {
            });

        // Cleanup subscriptions on unmount
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            supabaseClient.removeChannel(expensesChannel);
            supabaseClient.removeChannel(splitsChannel);
        };
    }, [identity?.id, debouncedFetchDebts]); // debouncedFetchDebts is now stable

    // Listen for settlement events from other components (profile page, expense page, etc.)
    useEffect(() => {
        return onSettlementEvent(() => {
            fetchDebtsRef.current();
        });
    }, []);

    return { data, isLoading, error, refetch: fetchDebts };
};
