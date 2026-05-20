import { useGetIdentity } from "@refinedev/core";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";

type Plan = "free" | "pro";

interface PlanState {
  plan: Plan;
  isPro: boolean;
  isExpired: boolean;
  isLoading: boolean;
}

const DEFAULT_STATE: PlanState = { plan: "free", isPro: false, isExpired: false, isLoading: true };

export function usePlan(): PlanState {
  const { data: identity } = useGetIdentity<Profile>();
  const [state, setState] = useState<PlanState>(DEFAULT_STATE);

  useEffect(() => {
    if (!identity?.id) return;
    supabaseClient
      .from("subscriptions")
      .select("plan, expires_at")
      .eq("user_id", identity.id)
      .single()
      .then(({ data }) => {
        if (!data) { setState({ plan: "free", isPro: false, isExpired: false, isLoading: false }); return; }
        const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
        const isPro = data.plan === "pro" && !isExpired;
        setState({ plan: data.plan as Plan, isPro, isExpired, isLoading: false });
      });
  }, [identity?.id]);

  return state;
}
