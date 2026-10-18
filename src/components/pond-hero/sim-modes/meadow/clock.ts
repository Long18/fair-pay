import { createContext, useContext } from "react";
import { useFrame } from "@react-three/fiber";

/** True under prefers-reduced-motion: every animated layer freezes at t = 0. */
export const StillContext = createContext(false);

/** useFrame that reports (elapsed, delta), both pinned to 0 when the scene is still. */
export function useClock(callback: (elapsed: number, delta: number) => void) {
  const still = useContext(StillContext);
  useFrame((state, delta) => callback(still ? 0 : state.clock.elapsedTime, still ? 0 : delta));
}
