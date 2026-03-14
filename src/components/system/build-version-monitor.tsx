import { coerceBuildInfo, currentBuildInfo, isNewBuildAvailable } from "@/lib/build-info";
import { memo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

const VERSION_URL = "/version.json";
const UPDATE_TOAST_ID = "build-version-update";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MIN_CHECK_GAP_MS = 1_000;

async function fetchLatestBuildInfo() {
  const response = await fetch(VERSION_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return coerceBuildInfo(await response.json());
}

async function unregisterBuildServiceWorkers(
  registration?: ServiceWorkerRegistration
) {
  if (registration) {
    await registration.unregister();
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(async (entry) => {
    await entry.unregister();
  }));
}

async function clearBuildCaches() {
  if (!("caches" in window)) {
    return;
  }

  const cacheKeys = await window.caches.keys();
  await Promise.all(cacheKeys.map(async (cacheKey) => {
    await window.caches.delete(cacheKey);
  }));
}

function forceReloadToLatestBuild() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("__refresh", Date.now().toString());
  window.location.replace(nextUrl.toString());
}

export async function refreshToLatestBuild(input: {
  hasWaitingServiceWorker: boolean;
  registration?: ServiceWorkerRegistration;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  clearCaches?: () => Promise<void>;
  unregisterServiceWorkers?: () => Promise<void>;
  reload?: () => void;
}) {
  if (input.hasWaitingServiceWorker) {
    await input.updateServiceWorker(true);
    return;
  }

  try {
    await (input.unregisterServiceWorkers
      ? input.unregisterServiceWorkers()
      : unregisterBuildServiceWorkers(input.registration));
  } catch {
    // Continue with the reload even if unregistering fails.
  }

  try {
    await (input.clearCaches ? input.clearCaches() : clearBuildCaches());
  } catch {
    // Continue with the reload even if cache cleanup fails.
  }

  (input.reload ?? forceReloadToLatestBuild)();
}

function BuildVersionMonitorInner() {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const hasPromptedRef = useRef(false);
  const lastCheckedAtRef = useRef(0);
  const nextVersionRef = useRef<string | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      registrationRef.current = registration;
    },
    onRegisterError(error: unknown) {
      console.error("[BuildVersionMonitor] Service worker registration failed:", error);
    },
  });

  const needRefreshRef = useRef(needRefresh);
  const updateServiceWorkerRef = useRef(updateServiceWorker);
  needRefreshRef.current = needRefresh;
  updateServiceWorkerRef.current = updateServiceWorker;

  const handleRefresh = async () => {
    await refreshToLatestBuild({
      hasWaitingServiceWorker: needRefreshRef.current,
      registration: registrationRef.current,
      updateServiceWorker: updateServiceWorkerRef.current,
    });
  };

  const promptForRefresh = () => {
    if (hasPromptedRef.current) {
      return;
    }

    hasPromptedRef.current = true;

    const description =
      nextVersionRef.current && nextVersionRef.current !== currentBuildInfo.version
        ? `${currentBuildInfo.version} -> ${nextVersionRef.current}`
        : "Nhấn làm mới để tải phiên bản mới nhất.";

    toast.message("Có phiên bản mới", {
      id: UPDATE_TOAST_ID,
      description,
      duration: Number.POSITIVE_INFINITY,
      dismissible: false,
      closeButton: false,
      action: {
        label: "Làm mới",
        onClick: () => {
          void handleRefresh();
        },
      },
    });
  };

  const checkForNewBuild = async () => {
    const now = Date.now();
    if (now - lastCheckedAtRef.current < MIN_CHECK_GAP_MS) {
      return;
    }

    lastCheckedAtRef.current = now;

    try {
      await registrationRef.current?.update();
    } catch {
      // Ignore SW update check errors and keep version polling fail-silent.
    }

    try {
      const latestBuildInfo = await fetchLatestBuildInfo();
      if (!latestBuildInfo) {
        return;
      }

      if (isNewBuildAvailable(latestBuildInfo)) {
        nextVersionRef.current = latestBuildInfo.version;
        promptForRefresh();
      }
    } catch {
      // Ignore version fetch errors to keep the monitor fail-silent.
    }
  };

  useEffect(() => {
    if (needRefresh) {
      promptForRefresh();
    }
  }, [needRefresh, promptForRefresh]);

  useEffect(() => {
    void checkForNewBuild();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForNewBuild();
      }
    };

    const handleFocus = () => {
      void checkForNewBuild();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkForNewBuild();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(intervalId);
      toast.dismiss(UPDATE_TOAST_ID);
    };
  }, [checkForNewBuild]);

  return null;
}

export const BuildVersionMonitor = memo(function BuildVersionMonitor() {
  if (currentBuildInfo.version.endsWith("-local-dev")) {
    return null;
  }

  return <BuildVersionMonitorInner />;
});
