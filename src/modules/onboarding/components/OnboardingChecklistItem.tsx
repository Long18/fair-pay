import React from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { CheckIcon, ArrowRightIcon } from "lucide-react";

export interface OnboardingChecklistItemProps {
  step: number;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

export function OnboardingChecklistItem({
  step,
  label,
  description,
  href,
  completed,
}: OnboardingChecklistItemProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      {/* Step indicator */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          completed
            ? "bg-green-500 text-white"
            : "bg-muted text-muted-foreground border border-border",
        )}
      >
        {completed ? (
          <CheckIcon className="h-4 w-4" />
        ) : (
          <span>{step}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-tight",
            completed && "line-through text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Arrow link if not completed */}
      {!completed && (
        <Link
          to={href}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Go to ${label}`}
        >
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
