import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVerticalIcon } from "@/components/ui/icons";

export interface ActionButtonConfig {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  disabled?: boolean;
  destructive?: boolean;
}

const actionButtonGroupVariants = cva("flex", {
  variants: {
    layout: {
      horizontal: "flex-row items-center",
      vertical: "flex-col items-stretch",
      dropdown: "flex-row items-center",
    },
  },
  defaultVariants: {
    layout: "horizontal",
  },
});

export interface ActionButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof actionButtonGroupVariants> {
  actions: ActionButtonConfig[];
  layout?: "horizontal" | "vertical" | "dropdown";
}

function ActionButtonGroup({
  actions,
  layout = "horizontal",
  className,
  ...props
}: ActionButtonGroupProps) {
  // Separate destructive and non-destructive actions
  const nonDestructiveActions = actions.filter((action) => !action.destructive);
  const destructiveActions = actions.filter((action) => action.destructive);

  // Dropdown layout: show all actions in a dropdown menu
  if (layout === "dropdown") {
    return (
      <div className={cn("flex items-center", className)} {...props}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px] md:size-9"
            >
              <MoreVerticalIcon className="size-4" />
              <span className="sr-only">Open actions menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nonDestructiveActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon && <action.icon className="size-4" />}
                {action.label}
              </DropdownMenuItem>
            ))}
            {destructiveActions.length > 0 && nonDestructiveActions.length > 0 && (
              <DropdownMenuSeparator />
            )}
            {destructiveActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                variant="destructive"
              >
                {action.icon && <action.icon className="size-4" />}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Horizontal or vertical layout
  const gapClass = layout === "horizontal" ? "gap-4" : "gap-4"; // 16px gap
  const destructiveGapClass = layout === "horizontal" ? "ml-6" : "mt-6"; // 24px gap

  return (
    <div
      className={cn(
        actionButtonGroupVariants({ layout }),
        gapClass,
        className
      )}
      {...props}
    >
      {/* Non-destructive actions */}
      {nonDestructiveActions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || "outline"}
          onClick={action.onClick}
          disabled={action.disabled}
          className="min-h-[44px] md:h-9"
        >
          {action.icon && <action.icon className="size-4" />}
          {action.label}
        </Button>
      ))}

      {/* Destructive actions with extra spacing */}
      {destructiveActions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || "destructive"}
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            "min-h-[44px] md:h-9",
            index === 0 && destructiveActions.length > 0 && destructiveGapClass
          )}
        >
          {action.icon && <action.icon className="size-4" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export { ActionButtonGroup, actionButtonGroupVariants };
