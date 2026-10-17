import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import { getCommonStyles } from "@/components/refine-ui/data-table/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AdminTableScroll } from "../../components/AdminTableScroll";

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, label, [role='menuitem'], [role='checkbox'], [role='combobox']";

interface PeopleTableProps<T> {
  table: TanstackTable<T>;
  /** Chrome reserved above/below the table, see AdminTableScroll */
  offset: string;
  getRowId: (row: T) => string;
  emptyLabel: string;
  selectedId?: string | null;
  onRowClick?: (row: T) => void;
}

/**
 * Desktop table for the People tabs: bounded scroll area with sticky header,
 * pinned trailing actions, clickable rows and a selected-row accent.
 */
export function PeopleTable<T>({
  table,
  offset,
  getRowId,
  emptyLabel,
  selectedId,
  onRowClick,
}: PeopleTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ horizontal: false, vertical: false });
  const rows = table.getRowModel().rows;
  const columnCount = table.getVisibleLeafColumns().length;
  // Row models are rebuilt whenever column defs change identity, so key on the data instead.
  const data = table.options.data;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const checkOverflow = () => {
      const tableEl = container.querySelector("table");
      if (!tableEl) return;
      const horizontal = tableEl.offsetWidth > container.clientWidth;
      const vertical = tableEl.offsetHeight > container.clientHeight;
      setOverflow((prev) =>
        prev.horizontal === horizontal && prev.vertical === vertical ? prev : { horizontal, vertical }
      );
    };
    checkOverflow();
    // Detail pane resizing changes the width without a window resize.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(checkOverflow);
    observer?.observe(container);
    window.addEventListener("resize", checkOverflow);
    const timeoutId = setTimeout(checkOverflow, 100);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", checkOverflow);
      clearTimeout(timeoutId);
    };
  }, [data]);

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return;
    const target = event.target as HTMLElement;
    // Clicks inside portaled menus bubble through React but are not DOM children.
    if (!event.currentTarget.contains(target)) return;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    onRowClick(row);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick || event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <AdminTableScroll ref={scrollRef} offset={offset} className="hidden md:block">
      <Table
        containerClassName="overflow-visible"
        style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={getCommonStyles({ column: header.column, isOverflowing: overflow })}
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
          {rows.length ? (
            rows.map((row) => {
              const id = getRowId(row.original);
              const isSelected = selectedId === id;
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? "selected" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={(event) => handleRowClick(event, row.original)}
                  onKeyDown={(event) => handleRowKeyDown(event, row.original)}
                  className={cn(
                    onRowClick &&
                      "cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    "data-[state=selected]:bg-primary/[0.06] data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={getCommonStyles({ column: cell.column, isOverflowing: overflow })}
                    >
                      <div className="truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AdminTableScroll>
  );
}
