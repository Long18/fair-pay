import { memo, useEffect } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useLocation } from "react-router";
import { useConsent } from "@/hooks/use-consent";
import type { Profile } from "@/modules/profile/types";
import { journeyTracking } from "./manager";

export const JourneyTrackingBridge = memo(() => {
  const location = useLocation();
  const { data: identity } = useGetIdentity<Profile>();
  const { isExperienceAllowed } = useConsent();

  useEffect(() => {
    if (isExperienceAllowed) journeyTracking.init();
  }, [isExperienceAllowed]);

  useEffect(() => {
    if (isExperienceAllowed && identity?.id) {
      journeyTracking.identify(identity.id);
    }
  }, [identity?.id, isExperienceAllowed]);

  useEffect(() => {
    if (!isExperienceAllowed) return;
    journeyTracking.pageView(`${location.pathname}${location.search}`, document.title);
  }, [location.pathname, location.search, isExperienceAllowed]);

  return null;
});

JourneyTrackingBridge.displayName = "JourneyTrackingBridge";
