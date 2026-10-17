import { useCallback, useSyncExternalStore } from "react";

export type AdminDensity = "comfortable" | "compact";

const STORAGE_KEY = "fairpay.admin.density";
const listeners = new Set<() => void>();

function readDensity(): AdminDensity {
  if (typeof window === "undefined") return "comfortable";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "compact"
      ? "compact"
      : "comfortable";
  } catch {
    return "comfortable";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAdminDensity() {
  const density = useSyncExternalStore(subscribe, readDensity, () => "comfortable" as const);

  const setDensity = useCallback((next: AdminDensity) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode); density stays session-only via listeners.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { density, setDensity };
}
