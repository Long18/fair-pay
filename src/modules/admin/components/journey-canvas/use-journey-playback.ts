import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const STEP_MS = 800;
const AUTO_START_DELAY_MS = 500;

export interface JourneyPlaybackState {
  activeStepIndex: number;
  isPlaying: boolean;
  stepCount: number;
  setStepCount: (count: number) => void;
  goToStep: (index: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepPrev: () => void;
  stepNext: () => void;
  reset: () => void;
}

export function useJourneyPlayback(): JourneyPlaybackState {
  const reducedMotion = useReducedMotion();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepCount, setStepCountState] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (stepCount <= 0) {
        setActiveStepIndex(0);
        return;
      }
      const clamped = Math.max(0, Math.min(index, stepCount - 1));
      setActiveStepIndex(clamped);
    },
    [stepCount],
  );

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
  }, [clearTimer]);

  const play = useCallback(() => {
    if (stepCount <= 1) return;
    setIsPlaying(true);
  }, [stepCount]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const stepPrev = useCallback(() => {
    pause();
    goToStep(activeStepIndex - 1);
  }, [activeStepIndex, goToStep, pause]);

  const stepNext = useCallback(() => {
    pause();
    goToStep(activeStepIndex + 1);
  }, [activeStepIndex, goToStep, pause]);

  const reset = useCallback(() => {
    pause();
    setActiveStepIndex(0);
    autoStartedRef.current = false;
  }, [pause]);

  const setStepCount = useCallback(
    (count: number) => {
      setStepCountState(count);
      setActiveStepIndex((prev) => (count <= 0 ? 0 : Math.min(prev, count - 1)));
    },
    [],
  );

  useEffect(() => {
    clearTimer();
    if (!isPlaying || stepCount <= 1 || reducedMotion) {
      return undefined;
    }

    const cap = stepCount - 1;
    const intervalId = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev >= cap) return prev;
        return prev + 1;
      });
    }, STEP_MS);
    timerRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      if (timerRef.current === intervalId) {
        timerRef.current = null;
      }
    };
  }, [isPlaying, stepCount, reducedMotion, clearTimer]);

  useEffect(() => {
    if (!isPlaying || stepCount <= 1 || activeStepIndex < stepCount - 1) return;
    const timeoutId = window.setTimeout(() => {
      setIsPlaying(false);
      clearTimer();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeStepIndex, isPlaying, stepCount, clearTimer]);

  useEffect(() => {
    if (stepCount <= 1 || reducedMotion || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const timer = setTimeout(() => setIsPlaying(true), AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stepCount, reducedMotion]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    activeStepIndex,
    isPlaying,
    stepCount,
    setStepCount,
    goToStep,
    play,
    pause,
    togglePlay,
    stepPrev,
    stepNext,
    reset,
  };
}
