import * as React from "react"
import { cn } from "@/lib/utils"

function ButtonGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group"
      className={cn(
        "flex [&>*:first-child]:rounded-e-none [&>*:last-child]:rounded-s-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>button+button]:-ms-px",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group-text"
      className={cn(
        "border-input bg-muted text-muted-foreground inline-flex items-center whitespace-nowrap border px-3 text-sm",
        "first:rounded-s-md last:rounded-e-md",
        "[&:not(:first-child)]:-ms-px",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupText }

