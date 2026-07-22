import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import type {
  ReferralStats,
  ShareDataPoint,
  TopReferrer,
  OnboardingRow,
  OnboardingSteps,
  OnboardingFunnelStep,
  ActivationFunnel,
  StreakBucket,
  DebtAgingSummary,
  SubscriptionStats,
  Experiment,
  ExperimentAssignment,
  EmailStats,
  SentEmail,
  TrackingHealth,
  TrackingHealthTrend,
} from "./types";

export function useReferralStats(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "referral-stats"],
    queryFn: async () => {
      const [codesRes, eventsRes] = await Promise.all([
        supabaseClient.from("referral_codes").select("id, user_id", { count: "exact", head: false }),
        supabaseClient.from("referral_events").select("referrer_id, event_type"),
      ]);

      if (codesRes.error) throw codesRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const codes = codesRes.data ?? [];
      const events = eventsRes.data ?? [];

      const totalCodes = codes.length;
      const totalClicks = events.filter((e) => e.event_type === "click").length;
      const totalSignups = events.filter((e) => e.event_type === "signup").length;

      const activeReferrerSet = new Set(
        events.reduce<typeof events[number]["referrer_id"][]>((acc, e) => {
          if (e.event_type === "signup") acc.push(e.referrer_id);
          return acc;
        }, []),
      );
      const activeReferrers = activeReferrerSet.size;

      return {
        totalCodes,
        totalClicks,
        totalSignups,
        activeReferrers,
      } satisfies ReferralStats;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useShareActivity(locale: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "share-activity-30d", locale],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabaseClient
        .from("user_tracking_events")
        .select("occurred_at, event_name, properties")
        .eq("event_name", "share_completed")
        .gte("occurred_at", thirtyDaysAgo.toISOString())
        .order("occurred_at", { ascending: true });

      if (error) throw error;

      const grouped: Record<string, { zalo: number; facebook: number; copy: number; download: number }> = {};

      for (const row of data ?? []) {
        const dateKey = (row.occurred_at as string).split("T")[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = { zalo: 0, facebook: 0, copy: 0, download: 0 };
        }
        const props = (row.properties ?? {}) as Record<string, unknown>;
        const platform = String(
          props.share_platform ?? props.share_target ?? props.share_method ?? "",
        ).toLowerCase();
        if (platform.includes("zalo")) grouped[dateKey].zalo += 1;
        else if (platform.includes("facebook")) grouped[dateKey].facebook += 1;
        else if (platform.includes("copy")) grouped[dateKey].copy += 1;
        else if (platform.includes("download")) grouped[dateKey].download += 1;
        else grouped[dateKey].copy += 1;
      }

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({
          date,
          label: new Date(date).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
          ...counts,
        })) satisfies ShareDataPoint[];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useTopReferrers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "top-referrers"],
    queryFn: async () => {
      const { data: events, error: eventsError } = await supabaseClient
        .from("referral_events")
        .select("referrer_id, event_type");

      if (eventsError) throw eventsError;

      const referrerMap: Record<string, { invites: number; signups: number }> = {};
      for (const ev of events ?? []) {
        if (!referrerMap[ev.referrer_id]) {
          referrerMap[ev.referrer_id] = { invites: 0, signups: 0 };
        }
        if (ev.event_type === "click") referrerMap[ev.referrer_id].invites += 1;
        if (ev.event_type === "signup") referrerMap[ev.referrer_id].signups += 1;
      }

      const topIds = Object.entries(referrerMap)
        .sort(([, a], [, b]) => b.invites - a.invites)
        .slice(0, 10)
        .map(([id]) => id);

      if (!topIds.length) return [];

      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", topIds);

      if (profilesError) throw profilesError;

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      return topIds.map((id) => ({
        user_id: id,
        full_name: profileMap[id]?.full_name ?? null,
        avatar_url: profileMap[id]?.avatar_url ?? null,
        invite_count: referrerMap[id].invites,
        signup_count: referrerMap[id].signups,
      })) satisfies TopReferrer[];
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Retention Data Hooks ─────────────────────────────────────────────

export function useOnboardingFunnel(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "onboarding-funnel"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("onboarding_steps, onboarding_completed");

      if (error) throw error;

      const rows = (data ?? []) as OnboardingRow[];
      const total = rows.length;
      if (total === 0) return { steps: [] as OnboardingFunnelStep[], total: 0, completedCount: 0 };

      const stepKeys: Array<keyof OnboardingSteps> = ["profile", "friend", "group", "expense", "settle"];
      const stepLabelKeys: Record<keyof OnboardingSteps, string> = {
        profile: "retention.stepProfile",
        friend: "retention.stepFriend",
        group: "retention.stepGroup",
        expense: "retention.stepExpense",
        settle: "retention.stepSettle",
      };

      const counts: Record<keyof OnboardingSteps, number> = {
        profile: 0,
        friend: 0,
        group: 0,
        expense: 0,
        settle: 0,
      };

      let completedCount = 0;
      for (const row of rows) {
        if (row.onboarding_completed) completedCount++;
        for (const key of stepKeys) {
          if (row.onboarding_steps?.[key]) counts[key]++;
        }
      }

      const steps: OnboardingFunnelStep[] = stepKeys.map((key) => ({
        key,
        labelKey: stepLabelKeys[key],
        count: counts[key],
        total,
        pct: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
      }));

      return { steps, total, completedCount };
    },
    enabled,
    staleTime: 60_000,
  });
}

const activationRpc = supabaseClient.rpc.bind(supabaseClient) as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: Error | null }>;

export function useActivationFunnel(enabled: boolean, cohortDays = 30) {
  return useQuery({
    queryKey: ["admin", "activation-funnel", cohortDays],
    queryFn: async () => {
      const { data, error } = await activationRpc("admin_get_activation_funnel", {
        p_cohort_days: cohortDays,
      });
      if (error) throw error;
      return (data ?? {
        cohort_days: cohortDays,
        signups: 0,
        first_expense: 0,
        active_7d: 0,
        signup_to_expense_rate: 0,
        signup_to_active_rate: 0,
        expense_to_active_rate: 0,
      }) as ActivationFunnel;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useStreakDistribution(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "streak-distribution"],
    queryFn: async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data, error } = await supabaseClient
        .from("user_tracking_events")
        .select("user_id, occurred_at")
        .eq("event_name", "page_view")
        .not("user_id", "is", null)
        .gte("occurred_at", sixtyDaysAgo.toISOString());

      if (error) throw error;

      const userDays: Record<string, Set<string>> = {};
      for (const row of data ?? []) {
        if (!row.user_id) continue;
        const day = (row.occurred_at as string).slice(0, 10);
        if (!userDays[row.user_id]) userDays[row.user_id] = new Set();
        userDays[row.user_id].add(day);
      }

      const buckets = { "0": 0, "1-3": 0, "4-7": 0, "8-14": 0, "15+": 0 };

      for (const days of Object.values(userDays)) {
        const sorted = Array.from(days).sort();
        let maxStreak = 1;
        let currentStreak = 1;
        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1]);
          const curr = new Date(sorted[i]);
          const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
          if (diff === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else if (diff > 1) {
            currentStreak = 1;
          }
        }

        if (maxStreak === 0) buckets["0"]++;
        else if (maxStreak <= 3) buckets["1-3"]++;
        else if (maxStreak <= 7) buckets["4-7"]++;
        else if (maxStreak <= 14) buckets["8-14"]++;
        else buckets["15+"]++;
      }

      const { count: totalUsers } = await supabaseClient
        .from("profiles")
        .select("id", { count: "exact", head: true });
      const activeCount = Object.values(userDays).length;
      buckets["0"] += Math.max(0, (totalUsers ?? 0) - activeCount);

      return [
        { label: "0d", bucket: "0", users: buckets["0"] },
        { label: "1-3d", bucket: "1-3", users: buckets["1-3"] },
        { label: "4-7d", bucket: "4-7", users: buckets["4-7"] },
        { label: "8-14d", bucket: "8-14", users: buckets["8-14"] },
        { label: "15+d", bucket: "15+", users: buckets["15+"] },
      ] as StreakBucket[];
    },
    enabled,
    staleTime: 120_000,
  });
}

export function useDebtAging(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "debt-aging"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: splits, error: splitsError } = await supabaseClient
        .from("payment_splits")
        .select("user_id, amount")
        .eq("settled", false)
        .lt("created_at", sevenDaysAgo.toISOString());

      if (splitsError) throw splitsError;

      const rows = splits ?? [];
      const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
      const totalDebt = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

      const { count: remindersSent, error: remindersError } = await supabaseClient
        .from("pending_email")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (remindersError) {
        console.warn("Could not load reminders count:", remindersError);
      }

      return {
        usersWithOldDebt: uniqueUsers,
        totalPendingDebt: totalDebt,
        remindersSent: remindersSent ?? 0,
      } satisfies DebtAgingSummary;
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Subscriptions Data Hook ──────────────────────────────────────────

export function useSubscriptionStats(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "subscription-stats"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("subscriptions")
        .select("plan");

      if (error) throw error;

      const rows = data ?? [];
      const proUsers = rows.filter((r) => r.plan === "pro").length;
      const freeUsers = rows.filter((r) => r.plan === "free").length;

      return { freeUsers, proUsers } satisfies SubscriptionStats;
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Experiments Data Hooks ───────────────────────────────────────────

export function useExperiments(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "experiments"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("experiments")
        .select("id, key, description, variants, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Experiment[];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useExperimentAssignments(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "experiment-assignments"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("experiment_assignments")
        .select("experiment_key, variant");

      if (error) throw error;
      return (data ?? []) as ExperimentAssignment[];
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Emails Data Hooks ────────────────────────────────────────────────

export function useEmailStats(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "email-stats"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [totalRes, recentRes, pendingRes] = await Promise.all([
        supabaseClient
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .not("email_sent_at", "is", null),
        supabaseClient
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .not("email_sent_at", "is", null)
          .gte("email_sent_at", sevenDaysAgo.toISOString()),
        supabaseClient
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("email_sent_at", null),
      ]);

      if (totalRes.error) throw totalRes.error;
      if (recentRes.error) throw recentRes.error;
      if (pendingRes.error) throw pendingRes.error;

      return {
        totalSent: totalRes.count ?? 0,
        sentLast7Days: recentRes.count ?? 0,
        pending: pendingRes.count ?? 0,
      } satisfies EmailStats;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useSentEmails(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "sent-emails"],
    queryFn: async () => {
      const { data: notifications, error } = await supabaseClient
        .from("notifications")
        .select("id, user_id, type, email_sent_at")
        .not("email_sent_at", "is", null)
        .order("email_sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = notifications ?? [];
      if (!rows.length) return [] as SentEmail[];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      return rows.map((n) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        email_sent_at: n.email_sent_at,
        full_name: profileMap[n.user_id]?.full_name ?? null,
        avatar_url: profileMap[n.user_id]?.avatar_url ?? null,
      })) satisfies SentEmail[];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useTrackingHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "tracking-health"],
    queryFn: async () => {
      const { data, error } = await activationRpc("admin_get_tracking_health");
      if (error) throw error;
      return (data ?? {
        window_hours: 24,
        total_events: 0,
        distinct_events: 0,
        events: [],
      }) as TrackingHealth;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useTrackingHealthTrend(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "tracking-health-trend"],
    queryFn: async () => {
      const now = Date.now();
      const hourMs = 60 * 60 * 1000;
      const currentSince = new Date(now - 24 * hourMs);
      const priorSince = new Date(now - 48 * hourMs);

      const { data, error } = await supabaseClient
        .from("user_tracking_events")
        .select("occurred_at")
        .gte("occurred_at", priorSince.toISOString())
        .order("occurred_at", { ascending: true });

      if (error) throw error;

      const rows = data ?? [];
      let currentTotal = 0;
      let priorTotal = 0;
      const hourlyMap: Record<string, number> = {};

      for (const row of rows) {
        const occurredAt = new Date(row.occurred_at as string);
        const t = occurredAt.getTime();
        if (t >= currentSince.getTime()) {
          currentTotal += 1;
          const hourKey = occurredAt.toISOString().slice(0, 13);
          hourlyMap[hourKey] = (hourlyMap[hourKey] ?? 0) + 1;
        } else {
          priorTotal += 1;
        }
      }

      const hourly: TrackingHealthTrend["hourly"] = [];
      for (let i = 23; i >= 0; i -= 1) {
        const bucketTime = new Date(now - i * hourMs);
        const hourKey = bucketTime.toISOString().slice(0, 13);
        hourly.push({
          hour: hourKey,
          label: bucketTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
          count: hourlyMap[hourKey] ?? 0,
        });
      }

      const deltaAbsolute = currentTotal - priorTotal;
      const deltaPercent = priorTotal > 0
        ? Math.round((deltaAbsolute / priorTotal) * 1000) / 10
        : null;

      return {
        hourly,
        current_total_events: currentTotal,
        prior_total_events: priorTotal,
        delta_absolute: deltaAbsolute,
        delta_percent: deltaPercent,
      } satisfies TrackingHealthTrend;
    },
    enabled,
    staleTime: 60_000,
  });
}
