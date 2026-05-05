import { journeyTracking } from "@/lib/journey-tracking";
import {
  buildTrackedUrl,
  getCanonicalDestinationPath,
  getCanonicalDestinationUrl,
  getUtmPropertiesFromUrl,
  stableUrlHash,
} from "@/lib/utm";
import {
  DEFAULT_UTM_PLATFORMS,
  findUtmPlatform,
  type ShareMethod,
  type UtmPlatform,
} from "@/lib/utm-config";
import type { JourneyEventName } from "@/lib/journey-tracking/types";

type ShareEventName =
  | "share_link_generated"
  | "share_button_clicked"
  | "share_copy_link_clicked"
  | "share_native_sheet_opened"
  | "share_completed"
  | "share_failed";

type SharePlatformDetection = "explicit" | "native_unobservable" | "copy_unknown" | "referrer_fallback";

export interface ShareTrackingBase {
  baseUrl?: string;
  shareUrl?: string;
  destinationUrl?: string;
  campaign: string;
  content: string;
  entityType: string;
  entityId?: string | null;
  title?: string;
  text?: string;
  term?: string | null;
  extraParams?: Record<string, string | number | boolean | null | undefined>;
  pagePath?: string;
  templateKey?: string;
}

interface ShareEventOptions extends ShareTrackingBase {
  eventName: ShareEventName;
  shareTarget: string;
  shareType: string;
  shareMethod: ShareMethod;
  sharePlatform?: string | null;
  sharePlatformDetection: SharePlatformDetection;
  trackedUrl: string;
  reason?: string;
}

export interface ShareWithTrackingOptions extends ShareTrackingBase {
  platformKey?: string | null;
  platform?: UtmPlatform | null;
  nativeShare?: (data: ShareData) => Promise<void>;
  canUseNativeShare?: boolean;
  clipboardWrite?: (value: string) => Promise<void>;
  openShareIntent?: (value: string, platform: UtmPlatform) => void | Promise<void>;
  fallbackContent?: string;
}

export interface CopyShareWithTrackingOptions extends ShareTrackingBase {
  clipboardWrite?: (value: string) => Promise<void>;
}

export type ShareTrackingResult =
  | { status: "shared"; url: string }
  | { status: "opened"; url: string; intentUrl: string }
  | { status: "copied"; url: string }
  | { status: "failed"; url: string; error: unknown };

function getPagePath(fallback?: string) {
  if (fallback) return fallback;
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function getShareUrl(options: ShareTrackingBase) {
  return options.shareUrl ?? options.baseUrl ?? options.destinationUrl ?? "/";
}

function getDestinationUrl(options: ShareTrackingBase) {
  return options.destinationUrl ?? options.baseUrl ?? options.shareUrl ?? "/";
}

function buildTrackedShareUrl(
  options: ShareTrackingBase & {
    source: string;
    medium: string;
  },
) {
  return buildTrackedUrl({
    baseUrl: getShareUrl(options),
    source: options.source,
    medium: options.medium,
    campaign: options.campaign,
    content: options.content,
    term: options.term,
    extraParams: options.extraParams,
  });
}

export function buildShareTrackedUrl(
  options: ShareTrackingBase & {
    source: string;
    medium: string;
  },
) {
  return buildTrackedShareUrl(options);
}

export function buildPlatformShareIntent({
  trackedUrl,
  title,
  text,
  platform,
}: {
  trackedUrl: string;
  title?: string;
  text?: string;
  platform: UtmPlatform;
}) {
  if (!platform.intent_url_template) return null;

  const replacements: Record<string, string> = {
    url: encodeURIComponent(trackedUrl),
    title: encodeURIComponent(title ?? ""),
    text: encodeURIComponent(text ?? title ?? ""),
  };

  return platform.intent_url_template.replace(/\{(url|title|text)\}/g, (_, key: string) => replacements[key] ?? "");
}

function openDefaultShareIntent(intentUrl: string) {
  if (typeof window === "undefined") return;
  if (/^(mailto|sms):/i.test(intentUrl)) {
    window.location.href = intentUrl;
    return;
  }
  window.open(intentUrl, "_blank", "noopener,noreferrer");
}

export function trackShareEvent(options: ShareEventOptions) {
  const destinationUrl = getCanonicalDestinationUrl(getDestinationUrl(options));
  const destinationPath = getCanonicalDestinationPath(destinationUrl);
  const generatedPath = getCanonicalDestinationPath(options.trackedUrl);

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
      share_method: options.shareMethod,
      share_platform: options.sharePlatform ?? undefined,
      share_platform_detection: options.sharePlatformDetection,
      share_target_observable: options.sharePlatformDetection === "explicit",
      entity_type: options.entityType,
      entity_id: options.entityId ?? undefined,
      template_key: options.templateKey,
      destination_url: destinationUrl,
      destination_path: destinationPath,
      generated_path: generatedPath,
      generated_url_hash: stableUrlHash(options.trackedUrl),
      reason: options.reason,
      ...getUtmPropertiesFromUrl(options.trackedUrl),
    },
  });
}

export async function copyShareLinkWithTracking(options: CopyShareWithTrackingOptions): Promise<ShareTrackingResult> {
  const trackedUrl = buildTrackedShareUrl({
    ...options,
    source: "unknown",
    medium: "copy_link",
  });
  const clipboardWrite = options.clipboardWrite ?? ((value: string) => navigator.clipboard.writeText(value));

  trackShareEvent({
    ...options,
    eventName: "share_copy_link_clicked",
    shareTarget: "copy_link",
    shareType: "copy_link",
    shareMethod: "copy_link",
    sharePlatform: null,
    sharePlatformDetection: "copy_unknown",
    trackedUrl,
  });
  trackShareEvent({
    ...options,
    eventName: "share_link_generated",
    shareTarget: "copy_link",
    shareType: "copy_link",
    shareMethod: "copy_link",
    sharePlatform: null,
    sharePlatformDetection: "copy_unknown",
    trackedUrl,
  });

  try {
    await clipboardWrite(trackedUrl);
    trackShareEvent({
      ...options,
      eventName: "share_completed",
      shareTarget: "copy_link",
      shareType: "copy_link",
      shareMethod: "copy_link",
      sharePlatform: null,
      sharePlatformDetection: "copy_unknown",
      trackedUrl,
    });
    return { status: "copied", url: trackedUrl };
  } catch (error) {
    trackShareEvent({
      ...options,
      eventName: "share_failed",
      shareTarget: "copy_link",
      shareType: "copy_link",
      shareMethod: "copy_link",
      sharePlatform: null,
      sharePlatformDetection: "copy_unknown",
      trackedUrl,
      reason: error instanceof Error ? error.name : "copy_failed",
    });
    return { status: "failed", url: trackedUrl, error };
  }
}

async function shareToExplicitPlatform(options: ShareWithTrackingOptions, platform: UtmPlatform): Promise<ShareTrackingResult> {
  const trackedUrl = buildTrackedShareUrl({
    ...options,
    source: platform.source,
    medium: platform.medium,
  });
  const intentUrl = buildPlatformShareIntent({
    trackedUrl,
    title: options.title,
    text: options.text,
    platform,
  });

  trackShareEvent({
    ...options,
    eventName: "share_button_clicked",
    shareTarget: platform.platform_key,
    shareType: "platform",
    shareMethod: "platform",
    sharePlatform: platform.platform_key,
    sharePlatformDetection: "explicit",
    trackedUrl,
  });
  trackShareEvent({
    ...options,
    eventName: "share_link_generated",
    shareTarget: platform.platform_key,
    shareType: "platform",
    shareMethod: "platform",
    sharePlatform: platform.platform_key,
    sharePlatformDetection: "explicit",
    trackedUrl,
  });

  if (!intentUrl) {
    const error = new Error("Missing platform intent URL template");
    trackShareEvent({
      ...options,
      eventName: "share_failed",
      shareTarget: platform.platform_key,
      shareType: "platform",
      shareMethod: "platform",
      sharePlatform: platform.platform_key,
      sharePlatformDetection: "explicit",
      trackedUrl,
      reason: error.message,
    });
    return { status: "failed", url: trackedUrl, error };
  }

  try {
    await (options.openShareIntent ?? openDefaultShareIntent)(intentUrl, platform);
    trackShareEvent({
      ...options,
      eventName: "share_completed",
      shareTarget: platform.platform_key,
      shareType: "platform",
      shareMethod: "platform",
      sharePlatform: platform.platform_key,
      sharePlatformDetection: "explicit",
      trackedUrl,
    });
    return { status: "opened", url: trackedUrl, intentUrl };
  } catch (error) {
    trackShareEvent({
      ...options,
      eventName: "share_failed",
      shareTarget: platform.platform_key,
      shareType: "platform",
      shareMethod: "platform",
      sharePlatform: platform.platform_key,
      sharePlatformDetection: "explicit",
      trackedUrl,
      reason: error instanceof Error ? error.name : "platform_share_failed",
    });
    return { status: "failed", url: trackedUrl, error };
  }
}

export async function shareWithTracking(options: ShareWithTrackingOptions): Promise<ShareTrackingResult> {
  const platform = options.platform ?? findUtmPlatform(DEFAULT_UTM_PLATFORMS, options.platformKey);
  if (platform?.method === "platform") {
    return shareToExplicitPlatform(options, platform);
  }
  const nativePlatform = findUtmPlatform(DEFAULT_UTM_PLATFORMS, "native_share");

  const trackedUrl = buildTrackedShareUrl({
    ...options,
    source: nativePlatform?.source ?? "unknown",
    medium: nativePlatform?.medium ?? "social_share",
  });

  trackShareEvent({
    ...options,
    eventName: "share_button_clicked",
    shareTarget: "native_share",
    shareType: "native_share",
    shareMethod: "native_share",
    sharePlatform: null,
    sharePlatformDetection: "native_unobservable",
    trackedUrl,
  });
  trackShareEvent({
    ...options,
    eventName: "share_link_generated",
    shareTarget: "native_share",
    shareType: "native_share",
    shareMethod: "native_share",
    sharePlatform: null,
    sharePlatformDetection: "native_unobservable",
    trackedUrl,
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
    shareMethod: "native_share",
    sharePlatform: null,
    sharePlatformDetection: "native_unobservable",
    trackedUrl,
  });

  try {
    await nativeShare({
      title: options.title,
      text: options.text,
      url: trackedUrl,
    });
    trackShareEvent({
      ...options,
      eventName: "share_completed",
      shareTarget: "native_share",
      shareType: "native_share",
      shareMethod: "native_share",
      sharePlatform: null,
      sharePlatformDetection: "native_unobservable",
      trackedUrl,
    });
    return { status: "shared", url: trackedUrl };
  } catch (error) {
    trackShareEvent({
      ...options,
      eventName: "share_failed",
      shareTarget: "native_share",
      shareType: "native_share",
      shareMethod: "native_share",
      sharePlatform: null,
      sharePlatformDetection: "native_unobservable",
      trackedUrl,
      reason: error instanceof Error ? error.name : "native_share_failed",
    });
    return { status: "failed", url: trackedUrl, error };
  }
}
