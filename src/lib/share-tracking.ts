import { journeyTracking } from "@/lib/journey-tracking";
import { buildTrackedUrl, getUtmPropertiesFromUrl } from "@/lib/utm";
import type { JourneyEventName } from "@/lib/journey-tracking/types";

type ShareEventName =
  | "share_link_generated"
  | "share_button_clicked"
  | "share_copy_link_clicked"
  | "share_native_sheet_opened"
  | "share_completed"
  | "share_failed";

export interface ShareTrackingBase {
  baseUrl: string;
  campaign: string;
  content: string;
  entityType: string;
  entityId?: string | null;
  title?: string;
  text?: string;
  term?: string | null;
  extraParams?: Record<string, string | number | boolean | null | undefined>;
  pagePath?: string;
}

interface ShareEventOptions extends ShareTrackingBase {
  eventName: ShareEventName;
  shareTarget: string;
  shareType: string;
  generatedUrl: string;
  reason?: string;
}

export interface ShareWithTrackingOptions extends ShareTrackingBase {
  nativeShare?: (data: ShareData) => Promise<void>;
  canUseNativeShare?: boolean;
  clipboardWrite?: (value: string) => Promise<void>;
  fallbackContent?: string;
}

export interface CopyShareWithTrackingOptions extends ShareTrackingBase {
  clipboardWrite?: (value: string) => Promise<void>;
}

export type ShareTrackingResult =
  | { status: "shared"; url: string }
  | { status: "copied"; url: string }
  | { status: "failed"; url: string; error: unknown };

function getPagePath(fallback?: string) {
  if (fallback) return fallback;
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function buildShareTrackedUrl(
  options: ShareTrackingBase & {
    source: string;
    medium: string;
  },
) {
  return buildTrackedUrl({
    baseUrl: options.baseUrl,
    source: options.source,
    medium: options.medium,
    campaign: options.campaign,
    content: options.content,
    term: options.term,
    extraParams: options.extraParams,
  });
}

export function trackShareEvent(options: ShareEventOptions) {
  journeyTracking.trackEvent({
    event_name: options.eventName as JourneyEventName,
    event_category: "share",
    page_path: getPagePath(options.pagePath),
    target_type: "share",
    target_key: `${options.entityType}:${options.campaign}:${options.shareTarget}`,
    flow_name: "share",
    step_name: options.eventName,
    properties: {
      share_type: options.shareType,
      share_target: options.shareTarget,
      entity_type: options.entityType,
      entity_id: options.entityId ?? undefined,
      generated_url: options.generatedUrl,
      reason: options.reason,
      ...getUtmPropertiesFromUrl(options.generatedUrl),
    },
  });
}

export async function copyShareLinkWithTracking(options: CopyShareWithTrackingOptions): Promise<ShareTrackingResult> {
  const generatedUrl = buildTrackedUrl({
    baseUrl: options.baseUrl,
    source: "copy_link",
    medium: "copy_link",
    campaign: options.campaign,
    content: options.content,
    term: options.term,
    extraParams: options.extraParams,
  });
  const clipboardWrite = options.clipboardWrite ?? ((value: string) => navigator.clipboard.writeText(value));

  trackShareEvent({
    ...options,
    eventName: "share_copy_link_clicked",
    shareTarget: "copy_link",
    shareType: "copy_link",
    generatedUrl,
  });
  trackShareEvent({
    ...options,
    eventName: "share_link_generated",
    shareTarget: "copy_link",
    shareType: "copy_link",
    generatedUrl,
  });

  try {
    await clipboardWrite(generatedUrl);
    trackShareEvent({
      ...options,
      eventName: "share_completed",
      shareTarget: "copy_link",
      shareType: "copy_link",
      generatedUrl,
    });
    return { status: "copied", url: generatedUrl };
  } catch (error) {
    trackShareEvent({
      ...options,
      eventName: "share_failed",
      shareTarget: "copy_link",
      shareType: "copy_link",
      generatedUrl,
      reason: error instanceof Error ? error.name : "copy_failed",
    });
    return { status: "failed", url: generatedUrl, error };
  }
}

export async function shareWithTracking(options: ShareWithTrackingOptions): Promise<ShareTrackingResult> {
  const generatedUrl = buildTrackedUrl({
    baseUrl: options.baseUrl,
    source: "native_share",
    medium: "social_share",
    campaign: options.campaign,
    content: options.content,
    term: options.term,
    extraParams: options.extraParams,
  });

  trackShareEvent({
    ...options,
    eventName: "share_button_clicked",
    shareTarget: "native_share",
    shareType: "native_share",
    generatedUrl,
  });
  trackShareEvent({
    ...options,
    eventName: "share_link_generated",
    shareTarget: "native_share",
    shareType: "native_share",
    generatedUrl,
  });

  const nativeShare = options.nativeShare ?? (typeof navigator !== "undefined" ? navigator.share?.bind(navigator) : undefined);
  const canUseNativeShare = options.canUseNativeShare ?? typeof nativeShare === "function";

  if (!canUseNativeShare || !nativeShare) {
    return copyShareLinkWithTracking({
      ...options,
      content: options.fallbackContent ?? "copy_link_button",
      clipboardWrite: options.clipboardWrite,
    });
  }

  trackShareEvent({
    ...options,
    eventName: "share_native_sheet_opened",
    shareTarget: "native_share",
    shareType: "native_share",
    generatedUrl,
  });

  try {
    await nativeShare({
      title: options.title,
      text: options.text,
      url: generatedUrl,
    });
    trackShareEvent({
      ...options,
      eventName: "share_completed",
      shareTarget: "native_share",
      shareType: "native_share",
      generatedUrl,
    });
    return { status: "shared", url: generatedUrl };
  } catch (error) {
    trackShareEvent({
      ...options,
      eventName: "share_failed",
      shareTarget: "native_share",
      shareType: "native_share",
      generatedUrl,
      reason: error instanceof Error ? error.name : "native_share_failed",
    });
    return { status: "failed", url: generatedUrl, error };
  }
}
