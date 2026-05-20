import { useGetIdentity } from "@refinedev/core";
import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";

type Variant = "control" | "treatment";

export function useExperiment(experimentKey: string): Variant {
  const { data: identity } = useGetIdentity<Profile>();
  const [variant, setVariant] = useState<Variant>("control");

  const assign = useCallback(async (userId: string) => {
    // Check existing assignment first
    const { data: existing } = await supabaseClient
      .from("experiment_assignments")
      .select("variant")
      .eq("user_id", userId)
      .eq("experiment_key", experimentKey)
      .single();

    if (existing) {
      setVariant(existing.variant as Variant);
      return;
    }

    // Random 50/50 assignment
    const newVariant: Variant = Math.random() < 0.5 ? "control" : "treatment";

    const { error } = await supabaseClient
      .from("experiment_assignments")
      .insert({ user_id: userId, experiment_key: experimentKey, variant: newVariant });

    if (!error) setVariant(newVariant);
  }, [experimentKey]);

  useEffect(() => {
    if (identity?.id) assign(identity.id);
  }, [identity?.id, assign]);

  return variant;
}
