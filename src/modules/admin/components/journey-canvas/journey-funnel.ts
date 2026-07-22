import type { UserTrackingEventRow } from "../../types";

export interface JourneyFunnelStageDef {
  key: string;
  labelKey: string;
  eventNames: readonly string[];
}

export const JOURNEY_FUNNEL_STAGES: readonly JourneyFunnelStageDef[] = [
  {
    key: "session",
    labelKey: "journey.funnel.session",
    eventNames: ["session_started"],
  },
  {
    key: "browse",
    labelKey: "journey.funnel.browse",
    eventNames: ["page_view"],
  },
  {
    key: "auth",
    labelKey: "journey.funnel.auth",
    eventNames: ["auth_login_success", "auth_signup_success"],
  },
  {
    key: "action",
    labelKey: "journey.funnel.action",
    eventNames: ["expense_create_success", "form_success", "form_submit"],
  },
  {
    key: "value",
    labelKey: "journey.funnel.value",
    eventNames: ["settlement_completed", "share_completed"],
  },
] as const;

export interface JourneyFunnelStageResult {
  key: string;
  labelKey: string;
  count: number;
  reached: boolean;
  conversionFromPrior: number | null;
}

export function computeJourneyFunnelStages(
  events: UserTrackingEventRow[],
): JourneyFunnelStageResult[] {
  const eventNameSet = new Set(events.map((event) => event.event_name));

  const results: JourneyFunnelStageResult[] = JOURNEY_FUNNEL_STAGES.map((stage) => {
    const count = events.filter((event) => stage.eventNames.includes(event.event_name)).length;
    return {
      key: stage.key,
      labelKey: stage.labelKey,
      count,
      reached: stage.eventNames.some((name) => eventNameSet.has(name)),
    };
  }).map((stage, index, all) => {
    if (index === 0) {
      return { ...stage, conversionFromPrior: null };
    }

    const prior = all[index - 1];
    if (!prior.reached || !stage.reached) {
      return { ...stage, conversionFromPrior: null };
    }

    const rate = prior.count > 0 ? Math.round((stage.count / prior.count) * 100) : null;
    return { ...stage, conversionFromPrior: rate };
  });

  return results;
}
