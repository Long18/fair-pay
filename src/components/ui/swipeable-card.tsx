import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "success";
  threshold?: number; // How far to swipe before triggering (0-1)
}

interface SwipeableCardProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  className,
  disabled = false,
}: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const swipeDirection = useRef<"left" | "right" | null>(null);

  const MAX_SWIPE = 120; // Maximum swipe distance in pixels

  useEffect(() => {
    // Reset swipe on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSwipeOffset(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
    swipeDirection.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isSwiping) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (swipeDirection.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      swipeDirection.current = Math.abs(deltaX) > Math.abs(deltaY) ? "left" : "right";
    }

    // Only handle horizontal swipes
    if (swipeDirection.current === "left") {
      const clampedDelta = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      setSwipeOffset(clampedDelta);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsSwiping(false);

    // Snap to action if threshold exceeded
    if (Math.abs(swipeOffset) > MAX_SWIPE * 0.4) {
      setSwipeOffset(swipeOffset > 0 ? MAX_SWIPE : -MAX_SWIPE);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    setSwipeOffset(0);
  };

  const getActionColors = (variant: SwipeAction["variant"] = "default") => {
    switch (variant) {
      case "destructive":
        return "bg-red-500 hover:bg-red-600 text-white";
      case "success":
        return "bg-green-500 hover:bg-green-600 text-white";
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  return (
    <div ref={cardRef} className={cn("relative overflow-hidden", className)}>
      {/* Left actions (visible when swiping right) */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-stretch">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center px-4 min-w-[80px] transition-opacity",
                getActionColors(action.variant),
                swipeOffset > 0 ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: `translateX(${Math.min(0, swipeOffset - MAX_SWIPE)}px)`,
              }}
            >
              {action.icon && <span className="mb-1">{action.icon}</span>}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (visible when swiping left) */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center px-4 min-w-[80px] transition-opacity",
                getActionColors(action.variant),
                swipeOffset < 0 ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: `translateX(${Math.max(0, swipeOffset + MAX_SWIPE)}px)`,
              }}
            >
              {action.icon && <span className="mb-1">{action.icon}</span>}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        className="transition-transform touch-pan-y"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
