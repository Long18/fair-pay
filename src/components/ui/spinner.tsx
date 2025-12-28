import * as React from "react";
import { cn } from "@/lib/utils";

import { Loader2Icon } from "@/components/ui/icons";
export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <Loader2Icon className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
    </div>
  );
}
