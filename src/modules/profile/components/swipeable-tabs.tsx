import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwipeableTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode[];
  className?: string;
  threshold?: number;
}

export const SwipeableTabs = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
  threshold = 50,
}: SwipeableTabsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const directionLocked = useRef<"x" | "y" | null>(null);
  const swipeHandled = useRef(false);

  useEffect(() => {
    const index = tabs.indexOf(activeTab);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [activeTab, tabs]);

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    directionLocked.current = null;
    swipeHandled.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || swipeHandled.current) return;

      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;

      // Lock direction after 10px of movement
      if (directionLocked.current === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        directionLocked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      // If vertical scroll detected, bail out entirely — let browser handle it
      if (directionLocked.current === "y") {
        return;
      }

      // Horizontal swipe — prevent vertical scroll interference
      if (directionLocked.current === "x") {
        e.preventDefault();
      }
    },
    []
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || swipeHandled.current) {
        touchStartRef.current = null;
        return;
      }

      // Only process horizontal swipes
      if (directionLocked.current !== "x") {
        touchStartRef.current = null;
        directionLocked.current = null;
        return;
      }

      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;

      if (dx > threshold && currentIndex > 0) {
        onTabChange(tabs[currentIndex - 1]);
        swipeHandled.current = true;
      } else if (dx < -threshold && currentIndex < tabs.length - 1) {
        onTabChange(tabs[currentIndex + 1]);
        swipeHandled.current = true;
      }

      touchStartRef.current = null;
      directionLocked.current = null;
    },
    [currentIndex, tabs, threshold, onTabChange]
  );

  if (!isTouchDevice) {
    return <div className={className}>{children[currentIndex]}</div>;
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          custom={currentIndex}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="w-full"
        >
          {children[currentIndex]}
        </motion.div>
      </AnimatePresence>

      {/* Swipe Indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        {tabs.map((_, index) => (
          <motion.div
            key={index}
            animate={{
              width: index === currentIndex ? 24 : 8,
              opacity: index === currentIndex ? 1 : 0.5,
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              "h-2 rounded-full bg-primary",
              index !== currentIndex && "bg-muted-foreground"
            )}
          />
        ))}
      </div>
    </div>
  );
};
