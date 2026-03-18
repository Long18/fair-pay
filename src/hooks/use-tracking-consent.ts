import { useState, useCallback } from "react";

const NOTICE_KEY = "fairpay.tracking-notice-dismissed";

function isNoticeDismissed(): boolean {
  try {
    return localStorage.getItem(NOTICE_KEY) === "true";
  } catch {
    return false;
  }
}

function dismissNotice(): void {
  try {
    localStorage.setItem(NOTICE_KEY, "true");
  } catch {
    // localStorage unavailable
  }
}

export function useTrackingNotice() {
  const [dismissed, setDismissed] = useState(isNoticeDismissed);

  const dismiss = useCallback(() => {
    dismissNotice();
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
