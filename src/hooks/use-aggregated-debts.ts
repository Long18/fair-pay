import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState } from "react";

export interface AggregatedDebt {
    counterparty_id: string;
    counterparty_name: string;
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

    const fetchDebts = async () => {
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

                setData(result || []);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch debts:", err);
                setData([]);
                setError(err instanceof Error ? err : new Error("Unknown error"));
            } finally {
                setIsLoading(false);
            }
        };

    useEffect(() => {
        fetchDebts();
    }, [identity?.id]);

    return { data, isLoading, error, refetch: fetchDebts };
};
