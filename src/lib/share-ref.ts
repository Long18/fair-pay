export const SHARE_REF_PARAM = "ref";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Taxonomy lookup tables — index 0 is always "unknown/fallback"
const SOURCES   = ["unknown","facebook","messenger","zalo","whatsapp","telegram","x","email","sms","copy_link","native_share"] as const;
const MEDIUMS   = ["unknown","social_share","direct_share","copy_link"] as const;
const CAMPAIGNS = ["unknown","expense_share","debt_share","friend_invite","group_invite","profile_share"] as const;
const CONTENTS  = ["unknown","expense_detail_share_button","expense_summary_share_button","debt_detail_share_button","friend_detail_share_button","group_detail_invite_button","profile_header_share_button"] as const;

// Bit layout: [content:3][campaign:3][medium:2][source:4] = 12 bits, max value 4095
const SRC_BITS  = 4;
const MED_BITS  = 2;
const CAM_BITS  = 3;
const MAX_N     = 1 << (SRC_BITS + MED_BITS + CAM_BITS + 3); // 4096

const TRACKING_QUERY_PARAMS = new Set(["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]);
const DEFAULT_ORIGIN = "https://long-pay.vercel.app";

export interface ShareRefPayload {
  source: string;
  medium: string;
  campaign: string;
  content: string;
}

function getWindowOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return DEFAULT_ORIGIN;
}

function isAbsoluteUrl(input: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(input) || input.startsWith("//");
}

function formatUrlOutput(url: URL, originalInput: string) {
  if (isAbsoluteUrl(originalInput)) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

function normalizeValue(s: string) {
  return s.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function idxOf(table: readonly string[], value: string): number {
  const i = table.indexOf(normalizeValue(value));
  return i > 0 ? i : 0;
}

function toBase62(n: number): string {
  if (n === 0) return "0";
  let result = "";
  let v = n;
  while (v > 0) {
    result = BASE62[v % 62] + result;
    v = Math.floor(v / 62);
  }
  return result;
}

function fromBase62(s: string): number {
  let n = 0;
  for (const c of s) {
    const i = BASE62.indexOf(c);
    if (i === -1) return -1;
    n = n * 62 + i;
    if (n >= MAX_N) return -1; // guard against long/garbage strings
  }
  return n;
}

export function buildShareRef(payload: Partial<ShareRefPayload>): string {
  const si = idxOf(SOURCES,   payload.source   ?? "");
  const mi = idxOf(MEDIUMS,   payload.medium   ?? "");
  const ci = idxOf(CAMPAIGNS, payload.campaign ?? "");
  const oi = idxOf(CONTENTS,  payload.content  ?? "");
  const n  = (oi << (SRC_BITS + MED_BITS + CAM_BITS)) | (ci << (SRC_BITS + MED_BITS)) | (mi << SRC_BITS) | si;
  return toBase62(n);
}

export function parseShareRef(ref: string | null | undefined): ShareRefPayload | null {
  if (!ref) return null;

  // Legacy verbose format: fp1_source~medium~campaign~content
  if (ref.startsWith("fp1_")) {
    const parts = ref.slice(4).split("~");
    if (parts.length !== 4) return null;
    const [source, medium, campaign, content] = parts;
    if (!source || !medium || !campaign || !content) return null;
    return { source, medium, campaign, content };
  }

  // Compact base62 format
  const n = fromBase62(ref);
  if (n < 0) return null;

  const si = n & ((1 << SRC_BITS) - 1);
  const mi = (n >> SRC_BITS) & ((1 << MED_BITS) - 1);
  const ci = (n >> (SRC_BITS + MED_BITS)) & ((1 << CAM_BITS) - 1);
  const oi = (n >> (SRC_BITS + MED_BITS + CAM_BITS)) & 0x7;

  return {
    source:   SOURCES[si]   ?? "unknown",
    medium:   MEDIUMS[mi]   ?? "unknown",
    campaign: CAMPAIGNS[ci] ?? "unknown",
    content:  CONTENTS[oi]  ?? "unknown",
  };
}

export function appendShareRef(
  input: string,
  payload: Partial<ShareRefPayload>,
  options: { baseOrigin?: string; overwriteRef?: boolean } = {},
): string {
  try {
    const url = new URL(input, options.baseOrigin ?? getWindowOrigin());
    for (const key of TRACKING_QUERY_PARAMS) url.searchParams.delete(key);
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
    const properties: Record<string, string> = { share_ref: shareRef };
    if (!payload) return properties;

    properties.utm_source   = payload.source;
    properties.utm_medium   = payload.medium;
    properties.utm_campaign = payload.campaign;
    properties.utm_content  = payload.content;

    return properties;
  } catch {
    return {};
  }
}
