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
 * Sample debt data for public/unauthenticated users
 * Format: "John owes Sarah" (neutral, shows relationship between two people)
 */
const SAMPLE_DEBTS: AggregatedDebt[] = [
    {
        counterparty_id: "demo-1",
        counterparty_name: "John",
        amount: 250000,
        i_owe_them: false, // Format as: "John owes [someone]"
        owedToName: "Sarah", // Who John owes money to
    },
    {
        counterparty_id: "demo-2",
        counterparty_name: "Mike",
        amount: 150000,
        i_owe_them: true, // Format as: "[someone] owes Mike"
        owedToName: "Alex", // Who owes money to Mike
    },
    {
        counterparty_id: "demo-3",
        counterparty_name: "Emma",
        amount: 300000,
        i_owe_them: false, // Format as: "Emma owes [someone]"
        owedToName: "John", // Who Emma owes money to
    },
] as any; // Type assertion needed for extra field

/**
 * Hook to fetch aggregated debts for current user using server-side function
 * This replaces client-side balance calculation with optimized database query
 *
 * When not authenticated, returns sample debt data for demo purposes
 */
export const useAggregatedDebts = () => {
    const { data: identity } = useGetIdentity<Profile>();
    const [data, setData] = useState<AggregatedDebt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchDebts = async () => {
            if (!identity?.id) {
                // Return sample data for unauthenticated users
                setData(SAMPLE_DEBTS);
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
