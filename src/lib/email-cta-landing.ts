/** `src` values stamped on email CTAs (`email_reminder`, `email_digest_reminder`, …). */
const EMAIL_SRC_RE = /^email_[a-z_]+$/;
const STORAGE_KEY = "fairpay_email_cta_landing";
const AUTH_PATHS = new Set(["/login", "/register", "/forgot-password", "/update-password"]);

export type EmailCtaVariant = "registered" | "guest";

export interface PendingEmailCtaLanding {
  src: string;
  variant: EmailCtaVariant;
}

export function readEmailCtaSrc(search: string): string | null {
  const src = new URLSearchParams(search).get("src");
  return src && EMAIL_SRC_RE.test(src) ? src : null;
}

/** Guest CTAs land on `/register`; everything else is a registered recipient. */
export function emailCtaVariantForPath(pathname: string): EmailCtaVariant {
  return pathname === "/register" ? "guest" : "registered";
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}

export function stripEmailCtaSrc(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("src");
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function loadPendingEmailCtaLanding(): PendingEmailCtaLanding | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingEmailCtaLanding>;
    if (!parsed.src || !EMAIL_SRC_RE.test(parsed.src)) return null;
    return { src: parsed.src, variant: parsed.variant === "guest" ? "guest" : "registered" };
  } catch {
    return null;
  }
}

export function savePendingEmailCtaLanding(pending: PendingEmailCtaLanding | null): void {
  try {
    if (pending) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage disabled: the landing is simply not tracked.
  }
}
