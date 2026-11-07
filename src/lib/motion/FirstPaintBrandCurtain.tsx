"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { isFirstPaintNavigation } from "./first-paint";
import { useReducedMotion } from "./reduced-motion";
import { useFirstPaintCurtainReady } from "./use-first-paint-curtain-ready";
import {
  FairPayLoaderLogo,
  FirstPaintBrandBackground,
} from "./brand-loader";
import { usePreloaderDocumentLock } from "./use-preloader-document-lock";
import { MM_PRELOADER } from "./mindmarket-preloader.tokens";

/**
 * Cold load preloader — MindMarket `.c-preloader` grammar:
 * fixed veil → logo draw → clip-path wipe up (not opacity-only).
 */
export function FirstPaintBrandCurtain() {
  const reducedMotion = useReducedMotion();
  const coldLoad = isFirstPaintNavigation();
  const [enabled] = useState(() => !reducedMotion && coldLoad);
  const [visible, setVisible] = useState(enabled);
  const readyToDismiss = useFirstPaintCurtainReady(enabled);
  const [exiting, setExiting] = useState(false);

  usePreloaderDocumentLock(enabled && (visible || exiting));

  useEffect(() => {
    if (!readyToDismiss || !visible || exiting) return;
    setExiting(true);
    setVisible(false);
  }, [readyToDismiss, visible, exiting]);

  if (reducedMotion || !enabled) return null;

  return (
    <AnimatePresence onExitComplete={() => setExiting(false)}>
      {visible ? (
        <motion.div
          key="first-paint-curtain"
          className="pointer-events-none fixed inset-0 z-[35] flex flex-col items-center justify-center overflow-hidden"
          style={{ clipPath: MM_PRELOADER.clipEnter }}
          initial={{ clipPath: MM_PRELOADER.clipEnter }}
          exit={{
            clipPath: MM_PRELOADER.clipExit,
            transition: {
              duration: MM_PRELOADER.clipExitDuration,
              ease: MM_PRELOADER.clipExitEase,
            },
          }}
          aria-hidden
          aria-busy="true"
        >
          <FirstPaintBrandBackground />
          <FairPayLoaderLogo />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
