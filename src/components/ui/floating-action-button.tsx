import React from "react";
import { Plus } from "lucide-react";
import { useGo } from "@refinedev/core";
import { Button } from "./button";
import { cn } from "@/lib/utils";

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
  icon = <Plus className="h-6 w-6" />,
  label = "Add Expense",
  className,
}) => {
  const go = useGo();

  const handleClick = () => {
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
        "h-14 w-14 rounded-full",
        "bg-[#FFA14E] hover:bg-[#FF8C2E]",
        "text-white shadow-lg hover:shadow-xl",
        "transition-all duration-200",
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
