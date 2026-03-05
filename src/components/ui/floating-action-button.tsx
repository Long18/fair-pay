import React from "react";
import { useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { Button } from "./button";
import { cn } from "@/lib/utils";

import { PlusIcon } from "@/components/ui/icons";
interface FABProps {
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

/**
 * Floating Action Button for quick access to primary actions
 * Positioned fixed at bottom-right on mobile, adapts to desktop
 */
export const FloatingActionButton: React.FC<FABProps> = ({
  onClick,
  href,
  icon = <PlusIcon className="h-6 w-6" />,
  label = "Add Expense",
  className,
}) => {
  const go = useGo();
  const { tap } = useHaptics();

  const handleClick = () => {
    tap();
    if (onClick) {
      onClick();
    } else if (href) {
      go({ to: href });
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "fixed bottom-20 right-4 z-50",
        "h-14 w-14 rounded-2xl",
        "bg-primary hover:bg-primary/90",
        "text-primary-foreground shadow-lg hover:shadow-xl",
        "transition-all duration-150 ease-out",
        "hover:scale-105 active:scale-95",
        "hover:ring-4 hover:ring-primary/20",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        "flex items-center justify-center",
        "md:bottom-8 md:right-8 md:h-16 md:w-16",
        className
      )}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );
};

export default FloatingActionButton;
