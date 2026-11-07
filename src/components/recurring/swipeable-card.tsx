import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import {
  SwipeableCard as BaseSwipeableCard,
} from "@/components/ui/swipeable-card";

interface SwipeAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "success";
  threshold?: number;
}

interface SwipeableCardProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  disabled?: boolean;
}

/** Recurring list swipe wrapper — touch swipe only below `md`. */
export function SwipeableCard({
  disabled,
  ...props
}: SwipeableCardProps) {
  const isMobile = useIsMobile();
  return (
    <BaseSwipeableCard
      {...props}
      disabled={disabled || !isMobile}
      className={props.className}
    />
  );
}
