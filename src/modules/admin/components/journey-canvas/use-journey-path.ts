import { useMemo } from "react";
import type { UserTrackingEventRow } from "../../types";
import { buildJourneyPath, type JourneyPathStep } from "./journey-path";

export function useJourneyPath(events: UserTrackingEventRow[] | undefined): JourneyPathStep[] {
  return useMemo(() => buildJourneyPath(events), [events]);
}

export type { JourneyPathStep };
