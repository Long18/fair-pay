import { useEffect } from "react";
import { useIsAuthenticated } from "@refinedev/core";
import { useLocation, useNavigate } from "react-router";
import { analytics } from "@/lib/analytics";
import {
  emailCtaVariantForPath,
  isAuthPath,
  loadPendingEmailCtaLanding,
  readEmailCtaSrc,
  savePendingEmailCtaLanding,
  stripEmailCtaSrc,
} from "@/lib/email-cta-landing";

/**
 * Captures `?src=email_*` from email CTAs before auth guards redirect, keeps it in
 * sessionStorage through login/signup, and emits `email_cta_landed` once the recipient
 * reaches an authenticated page. Then removes `src` from the URL.
 */
export function EmailCtaLandingTracker() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: auth, isLoading } = useIsAuthenticated();
  const authenticated = auth?.authenticated === true;

  useEffect(() => {
    const src = readEmailCtaSrc(location.search);
    let pending = loadPendingEmailCtaLanding();
    if (src && !pending) {
      pending = { src, variant: emailCtaVariantForPath(location.pathname) };
      savePendingEmailCtaLanding(pending);
    }

    if (!pending || isLoading || !authenticated || isAuthPath(location.pathname)) return;

    analytics.track({
      action: "email_cta_landed",
      category: "email",
      label: pending.src,
      properties: { src: pending.src, variant: pending.variant },
    });
    savePendingEmailCtaLanding(null);

    if (src) {
      navigate({ pathname: location.pathname, search: stripEmailCtaSrc(location.search), hash: location.hash }, { replace: true });
    }
  }, [authenticated, isLoading, location.hash, location.pathname, location.search, navigate]);

  return null;
}
