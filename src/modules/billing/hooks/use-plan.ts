import { useGetIdentity } from "@refinedev/core";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";

type Plan = "free" | "pro";

interface PlanState {
  plan: Plan;
  isPro: boolean;
  isExpired: boolean;
  status: string | null;
  isLoading: boolean;
}

const DEFAULT_STATE: PlanState = {
  plan: "free",
  isPro: false,
  isExpired: false,
  status: null,
  isLoading: true,
};

function derivePlanState(row: {
  plan?: string | null;
  expires_at?: string | null;
  status?: string | null;
}): PlanState {
  const plan = (row.plan === "pro" ? "pro" : "free") as Plan;
  const status = row.status ?? null;
  const isExpired = row.expires_at ? new Date(row.expires_at) < new Date() : false;

  // past_due: keep Pro briefly; canceled with future expires_at still Pro until period end
  const statusBlocksPro = status === "inactive" || status === "revoked";
  const isPro =
    plan === "pro" &&
    !isExpired &&
    !statusBlocksPro &&
    (status == null || status === "active" || status === "past_due" || status === "canceled");

  return { plan, isPro, isExpired, status, isLoading: false };
}

export function usePlan(): PlanState {
  const { data: identity } = useGetIdentity<Profile>();
  const [state, setState] = useState<PlanState>(DEFAULT_STATE);

  useEffect(() => {
    if (!identity?.id) return;

    let cancelled = false;

    const load = async () => {
      // Prefer status when the Polar migration column exists; fall back if not.
      const withStatus = await supabaseClient
        .from("subscriptions")
        .select("plan, expires_at, status")
        .eq("user_id", identity.id)
        .maybeSingle();

      if (cancelled) return;

      if (withStatus.error) {
        const fallback = await supabaseClient
          .from("subscriptions")
          .select("plan, expires_at")
          .eq("user_id", identity.id)
          .maybeSingle();

        if (cancelled) return;
        if (!fallback.data) {
          setState({ ...DEFAULT_STATE, isLoading: false });
          return;
        }
        setState(derivePlanState(fallback.data));
        return;
      }

      if (!withStatus.data) {
        setState({ ...DEFAULT_STATE, isLoading: false });
        return;
      }
      setState(derivePlanState(withStatus.data));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [identity?.id]);

  return state;
}
