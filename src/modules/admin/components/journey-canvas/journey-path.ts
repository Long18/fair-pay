import type { UserTrackingEventRow } from "../../types";

export interface JourneyPathStep {
  eventId: string;
  pagePath: string;
  eventName: string;
  occurredAt: string;
  index: number;
}

const PATH_EVENT_NAMES = new Set([
  "page_view",
  "nav_click",
  "session_started",
]);

export function buildJourneyPath(events: UserTrackingEventRow[] | undefined): JourneyPathStep[] {
  if (!events?.length) return [];

  const sorted = [...events]
    .filter((e) => PATH_EVENT_NAMES.has(e.event_name) && e.page_path)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  const steps: JourneyPathStep[] = [];
  let lastPage: string | null = null;

  for (const event of sorted) {
    if (event.page_path === lastPage) continue;
    lastPage = event.page_path;
    steps.push({
      eventId: event.id,
      pagePath: event.page_path,
      eventName: event.event_name,
      occurredAt: event.occurred_at,
      index: steps.length,
    });
  }

  return steps;
}

export function formatPageBasename(pagePath: string): string {
  if (!pagePath || pagePath === "/") return "/";
  const trimmed = pagePath.replace(/\/$/, "");
  const segments = trimmed.split("/").filter(Boolean);
  return segments.length > 0 ? `/${segments[segments.length - 1]}` : trimmed;
}
