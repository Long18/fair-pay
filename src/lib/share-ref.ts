export const SHARE_REF_PARAM = "ref";

const SHARE_REF_PREFIX = "fp1_";
const SHARE_REF_SEPARATOR = "~";

export interface ShareRefPayload {
  source: string;
  medium: string;
  campaign: string;
  content: string;
}

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

const DEFAULT_ORIGIN = "https://long-pay.vercel.app";

function getWindowOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_ORIGIN;
}

function isAbsoluteUrl(input: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(input) || input.startsWith("//");
}

function formatUrlOutput(url: URL, originalInput: string) {
  if (isAbsoluteUrl(originalInput)) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

function sanitizeShareRefValue(input: string | number | boolean | null | undefined) {
  if (input === null || input === undefined) return "";

  return String(input)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, 128);
}

function normalizePayload(payload: Partial<ShareRefPayload>): ShareRefPayload {
  return {
    source: sanitizeShareRefValue(payload.source) || "unknown",
    medium: sanitizeShareRefValue(payload.medium) || "social_share",
    campaign: sanitizeShareRefValue(payload.campaign) || "share",
    content: sanitizeShareRefValue(payload.content) || "share_button",
  };
}

export function buildShareRef(payload: Partial<ShareRefPayload>): string {
  const normalized = normalizePayload(payload);
  const parts = [
    normalized.source,
    normalized.medium,
    normalized.campaign,
    normalized.content,
  ];

  return `${SHARE_REF_PREFIX}${parts.join(SHARE_REF_SEPARATOR)}`;
}

export function parseShareRef(ref: string | null | undefined): ShareRefPayload | null {
  if (!ref?.startsWith(SHARE_REF_PREFIX)) return null;

  const rawParts = ref.slice(SHARE_REF_PREFIX.length).split(SHARE_REF_SEPARATOR);
  if (rawParts.length !== 4) return null;

  const [source, medium, campaign, content] = rawParts.map(sanitizeShareRefValue);
  if (!source || !medium || !campaign || !content) return null;

  return {
    source,
    medium,
    campaign,
    content,
  };
}

export function appendShareRef(
  input: string,
  payload: Partial<ShareRefPayload>,
  options: { baseOrigin?: string; overwriteRef?: boolean } = {},
) {
  try {
    const url = new URL(input, options.baseOrigin ?? getWindowOrigin());

    for (const key of TRACKING_QUERY_PARAMS) {
      url.searchParams.delete(key);
    }

    if ((options.overwriteRef ?? true) || !url.searchParams.has(SHARE_REF_PARAM)) {
      url.searchParams.set(SHARE_REF_PARAM, buildShareRef(payload));
    }

    return formatUrlOutput(url, input);
  } catch {
    return input;
  }
}

export function getShareRefPropertiesFromUrl(input: string, baseOrigin = getWindowOrigin()) {
  try {
    const url = new URL(input, baseOrigin);
    const shareRef = url.searchParams.get(SHARE_REF_PARAM);
    if (!shareRef) return {};

    const payload = parseShareRef(shareRef);
    const properties: Record<string, string> = {
      share_ref: shareRef,
    };

    if (!payload) return properties;

    properties.utm_source = payload.source;
    properties.utm_medium = payload.medium;
    properties.utm_campaign = payload.campaign;
    properties.utm_content = payload.content;

    return properties;
  } catch {
    return {};
  }
}
