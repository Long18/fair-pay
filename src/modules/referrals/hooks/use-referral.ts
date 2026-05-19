import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import type { Profile } from "@/modules/profile/types";

export function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function useMyReferralCode() {
  const { data: identity } = useGetIdentity<Profile>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["referral-code", identity?.id],
    queryFn: async () => {
      if (!identity?.id) throw new Error("Not authenticated");

      // Try to fetch existing code
      const { data, error } = await supabaseClient
        .from("referral_codes")
        .select("code")
        .eq("user_id", identity.id)
        .maybeSingle();

      if (error) throw error;
      if (data) return data.code as string;

      // Create a new code if none exists
      const code = generateReferralCode();
      const { data: inserted, error: insertError } = await supabaseClient
        .from("referral_codes")
        .insert({ user_id: identity.id, code })
        .select("code")
        .single();

      if (insertError) throw insertError;
      return inserted.code as string;
    },
    enabled: !!identity?.id,
    staleTime: 5 * 60 * 1000,
  });

  return query;
}

export function useReferralStats() {
  const { data: identity } = useGetIdentity<Profile>();

  const query = useQuery({
    queryKey: ["referral-stats", identity?.id],
    queryFn: async () => {
      if (!identity?.id) throw new Error("Not authenticated");

      const { data, error } = await supabaseClient
        .from("referral_events")
        .select("event_type")
        .eq("referrer_id", identity.id);

      if (error) throw error;

      const events = data ?? [];
      return {
        invited: events.length,
        signedUp: events.filter((e) => e.event_type === "signup").length,
        active: events.filter((e) => e.event_type === "active_30d").length,
      };
    },
    enabled: !!identity?.id,
    staleTime: 60 * 1000,
  });

  return query;
}
