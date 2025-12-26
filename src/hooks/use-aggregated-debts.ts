import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState } from "react";

export interface AggregatedDebt {
    counterparty_id: string;
    counterparty_name: string;
    amount: number;
    i_owe_them: boolean;
}

/**
 * Hook to fetch aggregated debts for current user using server-side function
 * This replaces client-side balance calculation with optimized database query
 */
export const useAggregatedDebts = () => {
    const { data: identity } = useGetIdentity<Profile>();
    const [data, setData] = useState<AggregatedDebt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchDebts = async () => {
            if (!identity?.id) {
                setData([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const { data: result, error: rpcError } = await supabaseClient.rpc(
                    "get_user_debts_aggregated",
                    {
                        p_user_id: identity.id,
                    }
                );

                if (rpcError) {
                    console.error("Error fetching aggregated debts:", rpcError);
                    throw rpcError;
                }

                setData(result || []);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Unknown error"));
            } finally {
                setIsLoading(false);
            }
        };

        fetchDebts();
    }, [identity?.id]);

    return { data, isLoading, error };
};
