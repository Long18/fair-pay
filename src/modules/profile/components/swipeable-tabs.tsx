import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
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
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const index = tabs.indexOf(activeTab);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [activeTab, tabs]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    const swipeThreshold = threshold;
    const swipeVelocity = 500;

    if (info.offset.x > swipeThreshold || info.velocity.x > swipeVelocity) {
      // Swiped right - go to previous tab
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        onTabChange(tabs[newIndex]);
      }
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -swipeVelocity) {
      // Swiped left - go to next tab
      if (currentIndex < tabs.length - 1) {
        const newIndex = currentIndex + 1;
        onTabChange(tabs[newIndex]);
      }
    }
  };

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
      };
    },
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  // Only enable swipe on touch devices
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  if (!isTouchDevice) {
    // On non-touch devices, just render children without swipe
    return <div className={className}>{children[currentIndex]}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
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
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          className={cn("w-full", isDragging && "cursor-grabbing")}
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