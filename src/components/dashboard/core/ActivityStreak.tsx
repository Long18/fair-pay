import { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { supabaseClient } from "@/utility";
import { Profile } from "@/modules/profile/types";

/**
 * ActivityStreak
 *
 * Counts distinct calendar days in the last 30 days on which the current user
 * has at least one event in user_tracking_events.
 * Shows a flame badge when streak >= 2.
 */
export function ActivityStreak() {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!identity?.id) return;

    let cancelled = false;

    async function fetchStreak() {
      setLoading(true);
      try {
        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { data, error } = await supabaseClient
          .from("user_tracking_events")
          .select("occurred_at")
          .eq("user_id", identity!.id)
          .gte("occurred_at", thirtyDaysAgo);

        if (error || !data) return;

        // Count distinct calendar days (local date string)
        const days = new Set(
          data.map((row: { occurred_at: string }) =>
            new Date(row.occurred_at).toLocaleDateString("en-CA") // YYYY-MM-DD
          )
        );

        if (!cancelled) setStreak(days.size);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStreak();
    return () => {
      cancelled = true;
    };
  }, [identity?.id]);

  if (loading || streak < 2) return null;

  return (
    <Badge
      variant="secondary"
      className="gap-1 px-2.5 py-1 text-sm font-semibold bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"
    >
      🔥 {t("activity.streak", { count: streak })}
    </Badge>
  );
}
