import type { JourneySessionContext, TrackingSessionPayload } from "./types";
import { sanitizeTrackingPath, sanitizeTrackingReferrer } from "./url";

export const JOURNEY_STORAGE_KEYS = {
  anonymousId: "fairpay.journey.anonymous-id",
  sessionId: "fairpay.journey.session-id",
  sessionStartedAt: "fairpay.journey.session-started-at",
  landingPath: "fairpay.journey.landing-path",
  landingReferrer: "fairpay.journey.landing-referrer",
  entryLink: "fairpay.journey.entry-link",
  lastPath: "fairpay.journey.last-path",
} as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `journey-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureAnonymousId(storage: StorageLike): string {
  const existing = storage.getItem(JOURNEY_STORAGE_KEYS.anonymousId);
  if (existing) return existing;

  const anonymousId = generateId();
  storage.setItem(JOURNEY_STORAGE_KEYS.anonymousId, anonymousId);
  return anonymousId;
}

export function bootstrapJourneySession(options: {
  localStorage: StorageLike;
  sessionStorage: StorageLike;
  href: string;
  referrer?: string | null;
  locale?: string | null;
  userAgent?: string | null;
}): JourneySessionContext {
  const anonymousId = ensureAnonymousId(options.localStorage);
  const existingSessionId = options.sessionStorage.getItem(JOURNEY_STORAGE_KEYS.sessionId);
  const existingStartedAt = options.sessionStorage.getItem(JOURNEY_STORAGE_KEYS.sessionStartedAt);
  const existingLandingPath = options.sessionStorage.getItem(JOURNEY_STORAGE_KEYS.landingPath);
  const existingLandingReferrer = options.sessionStorage.getItem(JOURNEY_STORAGE_KEYS.landingReferrer);
  const existingEntryLink = options.sessionStorage.getItem(JOURNEY_STORAGE_KEYS.entryLink);

  const landingPath = existingLandingPath ?? sanitizeTrackingPath(options.href);
  const landingReferrer = existingLandingReferrer ?? sanitizeTrackingReferrer(options.referrer);
  const entryLink = existingEntryLink ?? sanitizeTrackingPath(options.href);
  const sessionId = existingSessionId ?? generateId();
  const startedAt = existingStartedAt ?? new Date().toISOString();

  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.sessionId, sessionId);
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.sessionStartedAt, startedAt);
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.landingPath, landingPath);
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.landingReferrer, landingReferrer ?? "");
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.entryLink, entryLink);

  return {
    id: sessionId,
    anonymousId,
    startedAt,
    landingPath,
    landingReferrer,
    entryLink,
    locale: options.locale ?? null,
    deviceType: deriveDeviceType(options.userAgent),
  };
}

export function resetJourneySession(options: {
  sessionStorage: StorageLike;
  href: string;
  referrer?: string | null;
  locale?: string | null;
  userAgent?: string | null;
  anonymousId: string;
}): JourneySessionContext {
  const sessionId = generateId();
  const startedAt = new Date().toISOString();
  const landingPath = sanitizeTrackingPath(options.href);
  const landingReferrer = sanitizeTrackingReferrer(options.referrer);
  const entryLink = sanitizeTrackingPath(options.href);

  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.sessionId, sessionId);
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.sessionStartedAt, startedAt);
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.landingPath, landingPath);
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.landingReferrer, landingReferrer ?? "");
  options.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.entryLink, entryLink);
  options.sessionStorage.removeItem(JOURNEY_STORAGE_KEYS.lastPath);

  return {
    id: sessionId,
    anonymousId: options.anonymousId,
    startedAt,
    landingPath,
    landingReferrer,
    entryLink,
    locale: options.locale ?? null,
    deviceType: deriveDeviceType(options.userAgent),
  };
}

function deriveDeviceType(userAgent?: string | null) {
  if (!userAgent) return null;
  const normalized = userAgent.toLowerCase();
  if (/ipad|tablet/.test(normalized)) return "tablet";
  if (/mobile|iphone|android/.test(normalized)) return "mobile";
  return "desktop";
}

export function toTrackingSessionPayload(session: JourneySessionContext): TrackingSessionPayload {
  return {
    id: session.id,
    anonymous_id: session.anonymousId,
    started_at: session.startedAt,
    landing_path: session.landingPath,
    landing_referrer: session.landingReferrer,
    entry_link: session.entryLink,
    locale: session.locale,
    device_type: session.deviceType,
  };
}
