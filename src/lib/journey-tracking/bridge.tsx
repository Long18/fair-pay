import { memo, useEffect } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useLocation } from "react-router";
import type { Profile } from "@/modules/profile/types";
import { journeyTracking } from "./manager";

export const JourneyTrackingBridge = memo(() => {
  const location = useLocation();
  const { data: identity } = useGetIdentity<Profile>();

  useEffect(() => {
    journeyTracking.init();
  }, []);

  useEffect(() => {
    if (identity?.id) {
      journeyTracking.identify(identity.id);
    }
  }, [identity?.id]);

  useEffect(() => {
    journeyTracking.pageView(`${location.pathname}${location.search}`, document.title);
  }, [location.pathname, location.search]);

  return null;
});

JourneyTrackingBridge.displayName = "JourneyTrackingBridge";
