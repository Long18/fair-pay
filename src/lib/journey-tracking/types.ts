import type { AttributionContext } from "@/lib/utm";

import type { AllowedTrackingEventName } from "./allowed-events";

export type JourneyEventName = AllowedTrackingEventName;

export interface TrackEventInput {
  event_name: JourneyEventName;
  event_category: string;
  page_path: string;
  target_type?: string;
  target_key?: string;
  flow_name?: string;
  step_name?: string;
  referrer_path?: string | null;
  properties?: Record<string, unknown>;
  occurred_at?: string;
}

export interface JourneySessionContext {
  id: string;
  anonymousId: string;
  startedAt: string;
  landingPath: string;
  landingReferrer: string | null;
  entryLink: string;
  locale: string | null;
  deviceType: string | null;
}

export interface TrackingSessionPayload {
  id: string;
  anonymous_id: string;
  started_at: string;
  landing_path: string;
  landing_referrer: string | null;
  entry_link: string;
  locale: string | null;
  device_type: string | null;
}

export interface TrackingRequestPayload {
  session: TrackingSessionPayload;
  events: TrackEventInput[];
  access_token?: string | null;
  attribution?: AttributionContext | null;
}

export interface TrackedElementPayload {
  eventName: JourneyEventName;
  eventCategory: string;
  targetType: string;
  targetKey: string;
  flowName?: string;
  stepName?: string;
  properties?: Record<string, unknown>;
}
