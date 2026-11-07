"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocation } from "react-router";
import { NAV_CHROME_ROUTE_SNAP_MS } from "./nav-chrome";
import { ROUTE_TRANSITION } from "./preloader-shell.tokens";

type MotionRouteLoading = {
  /** In-app nav: header HUD until next view is ready (not full-screen preloader). */
  routeLoading: boolean;
  setRouteLoading: (loading: boolean) => void;
};

const MotionRouteLoadingContext = createContext<MotionRouteLoading | null>(null);

/**
 * BrowserRouter-safe route loading (no `useNavigation` — requires data router in RR7).
 */
export function MotionRouteLoadingProvider({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const [routeLoading, setRouteLoading] = useState(false);
  const prevPath = useRef(pathname);
  const isFirst = useRef(true);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  const setLoading = useCallback((loading: boolean) => {
    setRouteLoading(loading);
  }, []);

  const scheduleFinish = useCallback(() => {
    if (finishTimer.current) window.clearTimeout(finishTimer.current);
    const elapsed = performance.now() - startedAt.current;
    const minLead = Math.max(ROUTE_TRANSITION.minHudMs, NAV_CHROME_ROUTE_SNAP_MS + 280);
    const wait = Math.max(0, minLead - elapsed);
    finishTimer.current = window.setTimeout(() => {
      setRouteLoading(false);
      finishTimer.current = null;
    }, wait);
  }, []);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (finishTimer.current) window.clearTimeout(finishTimer.current);
    startedAt.current = performance.now();
    setRouteLoading(true);
  }, [pathname]);

  useEffect(() => {
    if (!routeLoading) return;

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(scheduleFinish);
    });
    return () => cancelAnimationFrame(id);
  }, [routeLoading, scheduleFinish]);

  useEffect(
    () => () => {
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ routeLoading, setRouteLoading: setLoading }),
    [routeLoading, setLoading],
  );

  return (
    <MotionRouteLoadingContext.Provider value={value}>
      {children}
    </MotionRouteLoadingContext.Provider>
  );
}

export function useMotionRouteLoading(): MotionRouteLoading {
  const ctx = useContext(MotionRouteLoadingContext);
  if (!ctx) {
    return { routeLoading: false, setRouteLoading: () => {} };
  }
  return ctx;
}
