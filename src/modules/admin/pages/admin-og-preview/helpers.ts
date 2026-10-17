// ─── Types ──────────────────────────────────────────────────────────

export interface OgMeta {
  title: string | null;
  description: string | null;
  image: string | null;
  imageWidth: string | null;
  imageHeight: string | null;
  url: string | null;
  siteName: string | null;
  type: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
}

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

export type CheckStatus = "idle" | "loading" | "success" | "error";

// ─── Helpers ────────────────────────────────────────────────────────

let logIdCounter = 0;

export function createLog(level: LogEntry["level"], message: string): LogEntry {
  return { id: ++logIdCounter, timestamp: new Date(), level, message };
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseOgMeta(html: string): OgMeta {
  const get = (property: string): string | null => {
    // Match both property="..." and name="..." patterns
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, "i"),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) return decodeHtmlEntities(match[1]);
    }
    return null;
  };

  return {
    title: get("og:title"),
    description: get("og:description"),
    image: get("og:image"),
    imageWidth: get("og:image:width"),
    imageHeight: get("og:image:height"),
    url: get("og:url"),
    siteName: get("og:site_name"),
    type: get("og:type"),
    twitterCard: get("twitter:card"),
    twitterTitle: get("twitter:title"),
    twitterDescription: get("twitter:description"),
    twitterImage: get("twitter:image"),
  };
}

export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
