export const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmParamKey = (typeof UTM_PARAM_KEYS)[number];

export interface BuildTrackedUrlOptions {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term?: string | null;
  extraParams?: Record<string, string | number | boolean | null | undefined>;
  overwriteUtm?: boolean;
  baseOrigin?: string;
}

export interface AttributionTouch {
  schema_version: 1;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_url: string;
  landing_path: string;
  first_seen_at: string;
  last_seen_at: string;
}

export interface AttributionContext {
  first_touch: AttributionTouch | null;
  last_touch: AttributionTouch | null;
}

export interface CaptureAttributionOptions {
  href?: string | null;
  referrer?: string | null;
  now?: string;
  storage?: StorageLike | null;
  cookie?: CookieAdapter | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CookieAdapter {
  read(name: string): string | null;
  write(name: string, value: string): void;
}

export const ATTRIBUTION_STORAGE_KEYS = {
  firstTouch: "fairpay_first_touch_attribution",
  lastTouch: "fairpay_last_touch_attribution",
} as const;

const DEFAULT_ORIGIN = "https://long-pay.vercel.app";
const MAX_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 180;
const TRACKING_DISPLAY_PARAM_PREFIXES = ["utm_"];
const TRACKING_DISPLAY_PARAMS = new Set(["gclid", "fbclid"]);
const TRACKED_REFERRERS: Array<[RegExp, string]> = [
  [/(\.|^)facebook\.com$/i, "facebook"],
  [/(\.|^)fb\.com$/i, "facebook"],
  [/(\.|^)messenger\.com$/i, "messenger"],
  [/(\.|^)m\.me$/i, "messenger"],
  [/(\.|^)tiktok\.com$/i, "tiktok"],
  [/(\.|^)instagram\.com$/i, "instagram"],
  [/(\.|^)zalo\.me$/i, "zalo"],
  [/(\.|^)zalo\.com$/i, "zalo"],
  [/(\.|^)whatsapp\.com$/i, "whatsapp"],
  [/(\.|^)wa\.me$/i, "whatsapp"],
  [/(\.|^)telegram\.org$/i, "telegram"],
  [/(\.|^)telegram\.me$/i, "telegram"],
  [/(\.|^)t\.me$/i, "telegram"],
  [/(\.|^)twitter\.com$/i, "x"],
  [/(\.|^)x\.com$/i, "x"],
];

function getWindowOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_ORIGIN;
}

function isAbsoluteUrl(input: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(input) || input.startsWith("//");
}

export function sanitizeUtmValue(input: string | number | boolean | null | undefined) {
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

function normalizeOptionalValue(input: string | number | boolean | null | undefined) {
  const value = sanitizeUtmValue(input);
  return value || null;
}

function formatUrlOutput(url: URL, originalInput: string) {
  if (isAbsoluteUrl(originalInput)) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

function parseUrl(input: string, baseOrigin = getWindowOrigin()) {
  return new URL(input, baseOrigin);
}

export function buildTrackedUrl(options: BuildTrackedUrlOptions): string {
  const origin = options.baseOrigin ?? getWindowOrigin();
  const url = parseUrl(options.baseUrl, origin);
  const utmValues: Record<UtmParamKey, string | null> = {
    utm_source: normalizeOptionalValue(options.source) || "unknown",
    utm_medium: normalizeOptionalValue(options.medium) || "social_share",
    utm_campaign: normalizeOptionalValue(options.campaign) || "share",
    utm_content: normalizeOptionalValue(options.content) || "share_button",
    utm_term: normalizeOptionalValue(options.term),
  };

  for (const key of UTM_PARAM_KEYS) {
    const value = utmValues[key];
    if (!value) continue;
    if (options.overwriteUtm || !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  for (const [rawKey, rawValue] of Object.entries(options.extraParams ?? {})) {
    if (rawValue === null || rawValue === undefined) continue;
    const key = rawKey.trim();
    if (!key) continue;
    const value = String(rawValue).slice(0, 255);
    if (options.overwriteUtm || !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  return formatUrlOutput(url, options.baseUrl);
}

function shouldStripDisplayParam(key: string) {
  return TRACKING_DISPLAY_PARAMS.has(key) || TRACKING_DISPLAY_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function stripTrackingParams(input: string, baseOrigin = getWindowOrigin()): string {
  try {
    const url = parseUrl(input, baseOrigin);
    for (const key of Array.from(url.searchParams.keys())) {
      if (shouldStripDisplayParam(key)) {
        url.searchParams.delete(key);
      }
    }
    return formatUrlOutput(url, input);
  } catch {
    return input;
  }
}

export function getCanonicalDestinationPath(input: string, baseOrigin = getWindowOrigin()) {
  try {
    const url = parseUrl(stripTrackingParams(input, baseOrigin), baseOrigin);
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

export function getCanonicalDestinationUrl(input: string, baseOrigin = getWindowOrigin()) {
  try {
    return parseUrl(stripTrackingParams(input, baseOrigin), baseOrigin).toString();
  } catch {
    return baseOrigin;
  }
}

export function stableUrlHash(input: string) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function buildBrowserCookieAdapter(): CookieAdapter | null {
  if (typeof document === "undefined") return null;

  return {
    read(name: string) {
      const prefix = `${name}=`;
      const entry = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(prefix));
      if (!entry) return null;

      try {
        return decodeURIComponent(entry.slice(prefix.length));
      } catch {
        return null;
      }
    },
    write(name: string, value: string) {
      const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_COOKIE_AGE_SECONDS}; SameSite=Lax${secure}`;
    },
  };
}

function safeRead(storage: StorageLike | null, cookie: CookieAdapter | null, key: string) {
  try {
    const value = storage?.getItem(key);
    if (value) return value;
  } catch {
    // Storage can be unavailable in private browsing or strict browser settings.
  }

  try {
    return cookie?.read(key) ?? null;
  } catch {
    return null;
  }
}

function safeWrite(storage: StorageLike | null, cookie: CookieAdapter | null, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing or strict browser settings.
  }

  try {
    cookie?.write(key, value);
  } catch {
    // Cookies can be disabled.
  }
}

function parseTouch(raw: string | null): AttributionTouch | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AttributionTouch>;
    if (parsed.schema_version !== 1 || !parsed.landing_url || !parsed.landing_path) {
      return null;
    }

    return {
      schema_version: 1,
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      utm_content: parsed.utm_content ?? null,
      utm_term: parsed.utm_term ?? null,
      referrer: parsed.referrer ?? null,
      landing_url: String(parsed.landing_url),
      landing_path: String(parsed.landing_path),
      first_seen_at: parsed.first_seen_at ?? new Date().toISOString(),
      last_seen_at: parsed.last_seen_at ?? parsed.first_seen_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function serializeTouch(touch: AttributionTouch) {
  return JSON.stringify(touch);
}

function sanitizeLandingUrl(input: string) {
  try {
    const url = new URL(input, getWindowOrigin());
    url.username = "";
    url.password = "";
    return url.toString().slice(0, 2048);
  } catch {
    return getWindowOrigin();
  }
}

function sanitizeLandingPath(input: string) {
  try {
    const url = new URL(input, getWindowOrigin());
    return `${url.pathname}${url.search}${url.hash}`.slice(0, 1024) || "/";
  } catch {
    return "/";
  }
}

function normalizeReferrer(input?: string | null) {
  if (!input) return null;

  try {
    const url = new URL(input);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "").slice(0, 512);
  } catch {
    return null;
  }
}

function mapReferrerSource(referrer: string | null, currentOrigin: string) {
  if (!referrer) return null;

  try {
    const referrerUrl = new URL(referrer);
    if (referrerUrl.origin === currentOrigin) return null;

    const hostname = referrerUrl.hostname.replace(/^www\./i, "");
    const mapped = TRACKED_REFERRERS.find(([pattern]) => pattern.test(hostname));
    return mapped?.[1] ?? (sanitizeUtmValue(hostname) || "referral");
  } catch {
    return "referral";
  }
}

function hasUtm(url: URL) {
  return UTM_PARAM_KEYS.some((key) => !!url.searchParams.get(key));
}

function buildTouchFromUrl(href: string, referrer: string | null, now: string): AttributionTouch {
  const url = new URL(href, getWindowOrigin());
  const normalizedReferrer = normalizeReferrer(referrer);
  const utmPresent = hasUtm(url);
  const referrerSource = utmPresent ? null : mapReferrerSource(normalizedReferrer, url.origin);
  const source = normalizeOptionalValue(url.searchParams.get("utm_source")) ?? referrerSource ?? "direct";
  const medium = normalizeOptionalValue(url.searchParams.get("utm_medium")) ?? (referrerSource ? "referral" : "none");

  return {
    schema_version: 1,
    utm_source: source,
    utm_medium: medium,
    utm_campaign: normalizeOptionalValue(url.searchParams.get("utm_campaign")),
    utm_content: normalizeOptionalValue(url.searchParams.get("utm_content")),
    utm_term: normalizeOptionalValue(url.searchParams.get("utm_term")),
    referrer: normalizedReferrer,
    landing_url: sanitizeLandingUrl(url.toString()),
    landing_path: sanitizeLandingPath(url.toString()),
    first_seen_at: now,
    last_seen_at: now,
  };
}

function shouldUpdateLastTouch(candidate: AttributionTouch, existing: AttributionTouch | null) {
  if (!existing) return true;
  if (candidate.utm_source === "direct" && candidate.utm_medium === "none") return false;
  return true;
}

export function captureAttributionFromUrl(options: CaptureAttributionOptions = {}): AttributionContext {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const cookie = options.cookie === undefined ? buildBrowserCookieAdapter() : options.cookie;
  const href = options.href ?? (typeof window !== "undefined" ? window.location.href : DEFAULT_ORIGIN);
  const referrer = options.referrer ?? (typeof document !== "undefined" ? document.referrer : null);
  const now = options.now ?? new Date().toISOString();
  const firstTouch = parseTouch(safeRead(storage, cookie, ATTRIBUTION_STORAGE_KEYS.firstTouch));
  const lastTouch = parseTouch(safeRead(storage, cookie, ATTRIBUTION_STORAGE_KEYS.lastTouch));
  const candidate = buildTouchFromUrl(href, referrer, now);
  const nextFirstTouch = firstTouch ?? candidate;
  const nextLastTouch = shouldUpdateLastTouch(candidate, lastTouch) ? candidate : lastTouch;

  if (!firstTouch) {
    safeWrite(storage, cookie, ATTRIBUTION_STORAGE_KEYS.firstTouch, serializeTouch(nextFirstTouch));
  }

  if (nextLastTouch && nextLastTouch !== lastTouch) {
    safeWrite(storage, cookie, ATTRIBUTION_STORAGE_KEYS.lastTouch, serializeTouch(nextLastTouch));
  }

  return {
    first_touch: nextFirstTouch,
    last_touch: nextLastTouch,
  };
}

export function getCurrentAttributionContext(options: Pick<CaptureAttributionOptions, "storage" | "cookie"> = {}): AttributionContext {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const cookie = options.cookie === undefined ? buildBrowserCookieAdapter() : options.cookie;

  return {
    first_touch: parseTouch(safeRead(storage, cookie, ATTRIBUTION_STORAGE_KEYS.firstTouch)),
    last_touch: parseTouch(safeRead(storage, cookie, ATTRIBUTION_STORAGE_KEYS.lastTouch)),
  };
}

export function getAttributionEventProperties(context = getCurrentAttributionContext()): Record<string, string> {
  const properties: Record<string, string> = {};
  const { first_touch: firstTouch, last_touch: lastTouch } = context;

  if (lastTouch?.utm_source) properties.utm_source = lastTouch.utm_source;
  if (lastTouch?.utm_medium) properties.utm_medium = lastTouch.utm_medium;
  if (lastTouch?.utm_campaign) properties.utm_campaign = lastTouch.utm_campaign;
  if (lastTouch?.utm_content) properties.utm_content = lastTouch.utm_content;
  if (lastTouch?.utm_term) properties.utm_term = lastTouch.utm_term;
  if (lastTouch) properties.attribution_type = "last_touch";

  if (firstTouch?.utm_source) properties.first_utm_source = firstTouch.utm_source;
  if (firstTouch?.utm_medium) properties.first_utm_medium = firstTouch.utm_medium;
  if (firstTouch?.utm_campaign) properties.first_utm_campaign = firstTouch.utm_campaign;
  if (firstTouch?.utm_content) properties.first_utm_content = firstTouch.utm_content;
  if (firstTouch?.utm_term) properties.first_utm_term = firstTouch.utm_term;
  if (firstTouch?.referrer) properties.first_referrer = firstTouch.referrer;
  if (firstTouch?.landing_url) properties.first_landing_url = firstTouch.landing_url;
  if (firstTouch?.landing_path) properties.first_landing_path = firstTouch.landing_path;
  if (firstTouch?.first_seen_at) properties.first_seen_at = firstTouch.first_seen_at;

  if (lastTouch?.utm_source) properties.last_utm_source = lastTouch.utm_source;
  if (lastTouch?.utm_medium) properties.last_utm_medium = lastTouch.utm_medium;
  if (lastTouch?.utm_campaign) properties.last_utm_campaign = lastTouch.utm_campaign;
  if (lastTouch?.utm_content) properties.last_utm_content = lastTouch.utm_content;
  if (lastTouch?.utm_term) properties.last_utm_term = lastTouch.utm_term;
  if (lastTouch?.referrer) properties.last_referrer = lastTouch.referrer;
  if (lastTouch?.landing_url) properties.last_landing_url = lastTouch.landing_url;
  if (lastTouch?.landing_path) properties.last_landing_path = lastTouch.landing_path;
  if (lastTouch?.last_seen_at) properties.last_seen_at = lastTouch.last_seen_at;
  if (lastTouch?.referrer) properties.referrer = lastTouch.referrer;
  if (lastTouch?.landing_url) properties.landing_url = lastTouch.landing_url;
  if (lastTouch?.landing_path) properties.landing_path = lastTouch.landing_path;

  return properties;
}

export function getUtmPropertiesFromUrl(input: string) {
  try {
    const url = new URL(input, getWindowOrigin());
    const properties: Record<string, string> = {};
    for (const key of UTM_PARAM_KEYS) {
      const value = url.searchParams.get(key);
      if (value) properties[key] = value;
    }
    return properties;
  } catch {
    return {};
  }
}
