"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Column } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "@/components/ui/icons";
export type DataTableSorterProps<TData> = {
  column: Column<TData>;
} & React.ComponentProps<typeof Button>;

export function DataTableSorter<TData>({
  column,
  className,
  ...props
}: DataTableSorterProps<TData>) {
  const title =
    column.getIsSorted() === "desc"
      ? `Sort by ${column.id} as descending`
      : column.getIsSorted() === "asc"
      ? `Sort by ${column.id} as ascending`
      : `Sort by ${column.id}`;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => column.toggleSorting(undefined, true)}
      title={title}
      aria-label={title}
      {...props}
      className={cn("data-[state=open]:bg-accent", "w-5 h-5", className)}
    >
      {column.getIsSorted() === "desc" ? (
        <ArrowDownIcon className={cn("text-primary", "!w-3", "!h-3")} />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUpIcon className={cn("text-primary", "!w-3", "!h-3")} />
      ) : (
        <ChevronsUpDownIcon
          className={cn("text-muted-foreground", "!w-3", "!h-3")}
        />
      )}
    </Button>
  );
}

DataTableSorter.displayName = "DataTableSorter";
