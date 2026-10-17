import type { CSSProperties, KeyboardEvent, SyntheticEvent } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import { flexRender, type Column } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { AdminTableScroll } from "../../components/AdminTableScroll";
import { useAdminTranslation } from "../../i18n";
import { PAGE_SIZE_OPTIONS, TABLE_OFFSET } from "./grid-config";

const ACTIONS_COLUMN_ID = "actions";
const MAX_SKELETON_ROWS = 12;

const stickyActionsHead = "sticky right-0 z-10 bg-background";
const stickyActionsCell = cn(
  "sticky right-0 z-[1] bg-background",
  "group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]",
  "group-data-[state=selected]:bg-muted"
);

function columnStyle<TData>(column: Column<TData>): CSSProperties {
  const size = column.getSize();
  return { width: size, minWidth: size };
}

function stopPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}

interface RefineDataGridProps<TData extends BaseRecord> {
  table: UseTableReturnType<TData, HttpError>;
  selectedId?: string | number | null;
  onRowClick?: (row: TData) => void;
  offset?: string;
  className?: string;
}

/**
 * Desktop table for refine `useTable` results: bounded scroll with sticky
 * header, click-to-open rows and a pinned actions column.
 */
export function RefineDataGrid<TData extends BaseRecord>({
  table,
  selectedId,
  onRowClick,
  offset = TABLE_OFFSET,
  className,
}: RefineDataGridProps<TData>) {
  const { tAdmin } = useAdminTranslation();
  const { reactTable, refineCore } = table;
  const rows = reactTable.getRowModel().rows;
  const leafColumns = reactTable.getVisibleLeafColumns();
  const isLoading = refineCore.tableQuery.isLoading;
  const skeletonCount = Math.min(Math.max(refineCore.pageSize, 1), MAX_SKELETON_ROWS);

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: TData) => {
    if (!onRowClick || event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <AdminTableScroll offset={offset} className={className}>
      <Table
        containerClassName="overflow-visible"
        style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}
      >
        <TableHeader>
          {reactTable.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={columnStyle(header.column)}
                  className={cn(
                    "text-xs text-muted-foreground",
                    header.column.id === ACTIONS_COLUMN_ID && stickyActionsHead
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonCount }, (_, index) => (
              <TableRow key={`skeleton-${index}`} aria-hidden="true" className="hover:bg-transparent">
                {leafColumns.map((column) => (
                  <TableCell key={column.id} style={columnStyle(column)}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={leafColumns.length}
                className="h-[200px] text-center text-sm text-muted-foreground"
              >
                {tAdmin("common.noData")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const record = row.original;
              const isSelected = selectedId != null && record.id === selectedId;
              return (
                <TableRow
                  key={record.id ?? row.id}
                  data-state={isSelected ? "selected" : undefined}
                  aria-selected={onRowClick ? isSelected : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(record) : undefined}
                  onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, record) : undefined}
                  className={cn(
                    "group",
                    onRowClick &&
                      "cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isActions = cell.column.id === ACTIONS_COLUMN_ID;
                    return (
                      <TableCell
                        key={cell.id}
                        style={columnStyle(cell.column)}
                        className={cn(isActions && stickyActionsCell)}
                        onClick={isActions ? stopPropagation : undefined}
                        onKeyDown={isActions ? stopPropagation : undefined}
                      >
                        <div className={cn("truncate", isActions && "flex justify-end")}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </AdminTableScroll>
  );
}

interface RefineDataGridPagerProps<TData extends BaseRecord> {
  table: UseTableReturnType<TData, HttpError>;
  className?: string;
}

/** Compact pagination row pinned under `RefineDataGrid`. */
export function RefineDataGridPager<TData extends BaseRecord>({
  table,
  className,
}: RefineDataGridPagerProps<TData>) {
  const { tAdmin } = useAdminTranslation();
  const { tap } = useHaptics();
  const { currentPage, setCurrentPage, pageCount, pageSize, setPageSize, tableQuery } =
    table.refineCore;
  const total = tableQuery.data?.total;
  const lastPage = Math.max(pageCount, 1);
  const canPrevious = currentPage > 1;
  const canNext = currentPage < lastPage;

  const goTo = (page: number) => {
    tap();
    setCurrentPage(page);
  };

  const navButton = "h-8 w-8 cursor-pointer p-0";

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 text-xs", className)}>
      <span className="tabular-nums text-muted-foreground">
        {typeof total === "number" ? tAdmin("layout.shell.resultsCount", { count: total }) : null}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{tAdmin("layout.shell.rowsPerPage")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              tap();
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-[4.5rem] text-xs" aria-label={tAdmin("layout.shell.rowsPerPage")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular-nums font-medium">
          {tAdmin("common.pageCount", { page: currentPage, total: lastPage })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className={cn(navButton, "hidden lg:inline-flex")}
            onClick={() => goTo(1)}
            disabled={!canPrevious}
            aria-label={tAdmin("layout.transactions.firstPage")}
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={navButton}
            onClick={() => goTo(currentPage - 1)}
            disabled={!canPrevious}
            aria-label={tAdmin("layout.transactions.previousPage")}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={navButton}
            onClick={() => goTo(currentPage + 1)}
            disabled={!canNext}
            aria-label={tAdmin("layout.transactions.nextPage")}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={cn(navButton, "hidden lg:inline-flex")}
            onClick={() => goTo(lastPage)}
            disabled={!canNext}
            aria-label={tAdmin("layout.transactions.lastPage")}
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
