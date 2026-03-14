import { currentBuildInfo } from "@/lib/build-info";
import { supabaseClient } from "@/utility/supabaseClient";
import { getTrackedElementPayload } from "./dom";
import {
  bootstrapJourneySession,
  JOURNEY_STORAGE_KEYS,
  resetJourneySession,
  toTrackingSessionPayload,
} from "./session";
import type { JourneySessionContext, TrackEventInput, TrackingRequestPayload } from "./types";
import { sanitizeTrackingPath } from "./url";

const BLOCKED_PROPERTY_KEYS = new Set([
  "access_token",
  "refresh_token",
  "password",
  "email",
  "comment",
  "comment_text",
  "note",
  "message",
  "content",
  "description",
  "token",
]);

const MAX_QUEUE_SIZE = 50;
const FLUSH_BATCH_SIZE = 20;
const FLUSH_DELAY_MS = 1500;
const PAGE_VIEW_DEDUP_WINDOW_MS = 750;

function sanitizeProperties(input?: Record<string, unknown>, depth = 0): Record<string, unknown> | undefined {
  if (!input || depth > 2) return undefined;

  const sanitized: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = rawKey.trim();
    if (!key || BLOCKED_PROPERTY_KEYS.has(key) || rawValue === null || rawValue === undefined) {
      continue;
    }

    if (typeof rawValue === "string") {
      sanitized[key] = rawValue.slice(0, 255);
      continue;
    }

    if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      sanitized[key] = rawValue;
      continue;
    }

    if (Array.isArray(rawValue)) {
      sanitized[key] = rawValue
        .filter((value) => ["string", "number", "boolean"].includes(typeof value))
        .slice(0, 20)
        .map((value) => (typeof value === "string" ? value.slice(0, 255) : value));
      continue;
    }

    if (typeof rawValue === "object") {
      sanitized[key] = sanitizeProperties(rawValue as Record<string, unknown>, depth + 1) ?? {};
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

class JourneyTrackingManager {
  private initialized = false;
  private queue: TrackEventInput[] = [];
  private session: JourneySessionContext | null = null;
  private flushTimer: number | null = null;
  private isFlushing = false;
  private currentPath = "/";
  private lastPagePath: string | null = null;
  private currentUserId: string | null = null;
  private accessToken: string | null = null;
  private lastPageView: { path: string; at: number } | null = null;

  init() {
    if (this.initialized || typeof window === "undefined") return;

    this.session = bootstrapJourneySession({
      localStorage: window.localStorage,
      sessionStorage: window.sessionStorage,
      href: window.location.href,
      referrer: document.referrer,
      locale: navigator.language,
      userAgent: navigator.userAgent,
    });
    this.currentPath = sanitizeTrackingPath(window.location.href, window.location.origin);
    this.lastPagePath = window.sessionStorage.getItem(JOURNEY_STORAGE_KEYS.lastPath);

    document.addEventListener("click", this.handleDocumentClick, true);
    window.addEventListener("pagehide", this.handlePageHide);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    supabaseClient.auth.getSession().then(({ data }) => {
      this.accessToken = data.session?.access_token ?? null;
    }).catch(() => {});

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.accessToken = session?.access_token ?? null;
      if (session?.user) {
        this.currentUserId = session.user.id;
      }
    });

    this.initialized = true;
  }

  identify(userId: string) {
    this.init();
    this.currentUserId = userId;
    this.flush({ preferBeacon: false }).catch(() => {});
  }

  clearUser() {
    this.init();
    this.currentUserId = null;
    this.accessToken = null;

    if (typeof window === "undefined" || !this.session) return;

    this.session = resetJourneySession({
      sessionStorage: window.sessionStorage,
      href: window.location.href,
      referrer: document.referrer,
      locale: navigator.language,
      userAgent: navigator.userAgent,
      anonymousId: this.session.anonymousId,
    });
    this.currentPath = sanitizeTrackingPath(window.location.href, window.location.origin);
    this.lastPagePath = null;
  }

  pageView(path: string, title?: string) {
    this.init();
    const normalizedPath = sanitizeTrackingPath(path, window.location.origin);
    const now = Date.now();

    if (
      this.lastPageView &&
      this.lastPageView.path === normalizedPath &&
      now - this.lastPageView.at < PAGE_VIEW_DEDUP_WINDOW_MS
    ) {
      return;
    }

    const referrerPath = this.currentPath || this.lastPagePath;
    this.trackEvent({
      event_name: "page_view",
      event_category: "navigation",
      page_path: normalizedPath,
      referrer_path: referrerPath,
      properties: {
        page_title: title,
      },
    });

    this.lastPageView = { path: normalizedPath, at: now };
    this.lastPagePath = this.currentPath;
    this.currentPath = normalizedPath;
    window.sessionStorage.setItem(JOURNEY_STORAGE_KEYS.lastPath, normalizedPath);
  }

  trackEvent(input: TrackEventInput) {
    this.init();
    const pagePath = sanitizeTrackingPath(input.page_path, window.location.origin);
    const referrerPath = input.referrer_path === undefined
      ? this.currentPath
      : input.referrer_path
        ? sanitizeTrackingPath(input.referrer_path, window.location.origin)
        : null;

    const event: TrackEventInput = {
      ...input,
      page_path: pagePath,
      referrer_path: referrerPath,
      properties: sanitizeProperties({
        ...(input.properties ?? {}),
        app_version: currentBuildInfo.version,
        app_channel: currentBuildInfo.channel,
        commit_sha: currentBuildInfo.commitSha ?? undefined,
        user_state: this.currentUserId ? "authenticated" : "anonymous",
      }),
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    };

    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }

    if (this.queue.length >= FLUSH_BATCH_SIZE) {
      void this.flush({ preferBeacon: false });
      return;
    }

    if (this.flushTimer !== null) {
      window.clearTimeout(this.flushTimer);
    }
    this.flushTimer = window.setTimeout(() => {
      void this.flush({ preferBeacon: false });
    }, FLUSH_DELAY_MS);
  }

  trackFormView(flowName: string, stepName: string, pagePath = window.location.pathname) {
    this.trackEvent({
      event_name: "form_step_view",
      event_category: "form",
      page_path: pagePath,
      flow_name: flowName,
      step_name: stepName,
      target_type: "form",
      target_key: `${flowName}:${stepName}`,
    });
  }

  async flush(options: { preferBeacon: boolean }) {
    if (this.isFlushing || !this.session || this.queue.length === 0) return;

    if (this.flushTimer !== null) {
      window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.isFlushing = true;
    const events = this.queue.splice(0, FLUSH_BATCH_SIZE);
    const payload: TrackingRequestPayload = {
      session: toTrackingSessionPayload(this.session),
      events,
      access_token: this.accessToken,
    };

    try {
      if (options.preferBeacon && this.trySendBeacon(payload)) {
        this.isFlushing = false;
        return;
      }

      await this.sendWithFetch(payload);
    } catch (error) {
      this.queue = [...events, ...this.queue].slice(-MAX_QUEUE_SIZE);
      console.warn("[JourneyTracking] Failed to flush events", error);
    } finally {
      this.isFlushing = false;
    }
  }

  private trySendBeacon(payload: TrackingRequestPayload) {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
      return false;
    }

    const endpoint = this.getEndpoint();
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    return navigator.sendBeacon(endpoint, blob);
  }

  private async sendWithFetch(payload: TrackingRequestPayload) {
    const endpoint = this.getEndpoint();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      headers.apikey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`Tracking flush failed with status ${response.status}`);
    }
  }

  private getEndpoint() {
    const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
    if (!baseUrl) {
      throw new Error("Missing VITE_SUPABASE_URL for journey tracking");
    }
    return `${baseUrl}/functions/v1/track-client-event`;
  }

  private handleDocumentClick = (event: MouseEvent) => {
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-track-id]") : null;
    if (!target) return;

    const payload = getTrackedElementPayload(target);
    if (!payload) return;

    this.trackEvent({
      event_name: payload.eventName,
      event_category: payload.eventCategory,
      page_path: this.currentPath,
      target_type: payload.targetType,
      target_key: payload.targetKey,
      flow_name: payload.flowName,
      step_name: payload.stepName,
      properties: payload.properties,
    });
  };

  private handlePageHide = () => {
    void this.flush({ preferBeacon: true });
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      void this.flush({ preferBeacon: true });
    }
  };
}

export const journeyTracking = new JourneyTrackingManager();
