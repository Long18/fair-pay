const ALLOWED_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "ref",
]);

export function sanitizeTrackingPath(input?: string | null, base = "https://journey-tracker.local"): string {
  if (!input) return "/";

  try {
    const url = new URL(input, base);
    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (ALLOWED_QUERY_PARAMS.has(key) && value) {
        params.set(key, value.slice(0, 255));
      }
    }

    const pathname = url.pathname || "/";
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  } catch {
    return "/";
  }
}

export function sanitizeTrackingReferrer(input?: string | null): string | null {
  if (!input) return null;

  try {
    const url = new URL(input);
    return `${url.origin}${url.pathname}`.slice(0, 512);
  } catch {
    return null;
  }
}

export function extractTrackingAttribution(entryLink: string) {
  const url = new URL(entryLink, "https://journey-tracker.local");
  return {
    utmSource: url.searchParams.get("utm_source"),
    utmMedium: url.searchParams.get("utm_medium"),
    utmCampaign: url.searchParams.get("utm_campaign"),
    utmContent: url.searchParams.get("utm_content"),
    utmTerm: url.searchParams.get("utm_term"),
    ref: url.searchParams.get("ref"),
  };
}

export function deriveTrackingSource(entryLink: string, referrer?: string | null): string {
  const attribution = extractTrackingAttribution(entryLink);
  if (attribution.utmSource) return attribution.utmSource;
  if (attribution.ref) return attribution.ref;
  if (!referrer) return "direct";

  try {
    return new URL(referrer).hostname;
  } catch {
    return "referrer";
  }
}
