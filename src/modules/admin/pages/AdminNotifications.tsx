import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  SearchIcon,
  BellIcon,
  FilterIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface NotificationRow {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── Debounce Hook ──────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Notification Type Config ───────────────────────────────────────

const NOTIFICATION_TYPES = [
  "expense_added",
  "expense_updated",
  "expense_deleted",
  "payment_received",
  "payment_sent",
  "group_invite",
  "group_joined",
  "group_left",
  "friend_request",
  "friend_accepted",
  "settlement_reminder",
] as const;

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800">
      {type.replace(/_/g, " ")}
    </Badge>
  );
}

function ReadStatusBadge({ isRead }: { isRead: boolean }) {
  return isRead ? (
    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
      Đã đọc
    </Badge>
  ) : (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
      Chưa đọc
    </Badge>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminNotifications() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Build filters for Refine useTable
  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (debouncedSearch) {
      f.push({ field: "message", operator: "contains", value: debouncedSearch });
    }
    if (typeFilter !== "all") {
      f.push({ field: "type", operator: "eq", value: typeFilter });
    }
    if (readFilter !== "all") {
      f.push({ field: "is_read", operator: "eq", value: readFilter === "read" });
    }
    if (dateFrom) {
      f.push({ field: "created_at", operator: "gte", value: dateFrom });
    }
    if (dateTo) {
      f.push({ field: "created_at", operator: "lte", value: dateTo + "T23:59:59" });
    }
    return f;
  }, [debouncedSearch, typeFilter, readFilter, dateFrom, dateTo]);

  // ─── Column Definitions ─────────────────────────────────────────

  const columns = useMemo<ColumnDef<NotificationRow>[]>(
    () => [
      {
        id: "recipient",
        header: "Người nhận",
        accessorKey: "user_name",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={row.original.user_avatar ?? undefined}
                alt={row.original.user_name}
              />
              <AvatarFallback className="text-xs">
                {row.original.user_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.user_name}</span>
          </div>
        ),
      },
      {
        id: "type",
        header: "Loại thông báo",
        accessorKey: "type",
        size: 160,
        enableSorting: false,
        cell: ({ getValue }) => <TypeBadge type={getValue() as string} />,
      },
      {
        id: "message",
        header: "Nội dung",
        accessorKey: "message",
        size: 250,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm truncate block max-w-[250px]" title={getValue() as string}>
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "is_read",
        header: "Trạng thái",
        accessorKey: "is_read",
        size: 120,
        enableSorting: false,
        cell: ({ getValue }) => <ReadStatusBadge isRead={getValue() as boolean} />,
      },
      {
        id: "created_at",
        header: "Ngày tạo",
        accessorKey: "created_at",
        size: 120,
        cell: ({ getValue }) => formatDate(getValue() as string),
      },
    ],
    [],
  );

  // ─── Table Setup ────────────────────────────────────────────────

  const table = useTable<NotificationRow>({
    columns,
    refineCoreProps: {
      resource: "notifications",
      meta: {
        select: "*, profiles!notifications_user_id_fkey(full_name, avatar_url)",
      },
      pagination: { pageSize: 10 },
      filters: {
        permanent: filters as any,
      },
      sorters: {
        initial: [{ field: "created_at", order: "desc" }],
      },
      queryOptions: {
        select: (data) => {
          const transformed = data.data.map((n: any) => ({
            id: n.id,
            user_id: n.user_id,
            user_name: n.profiles?.full_name ?? "Không rõ",
            user_avatar: n.profiles?.avatar_url ?? null,
            type: n.type,
            title: n.title ?? "",
            message: n.message ?? "",
            is_read: n.is_read ?? false,
            created_at: n.created_at,
          }));
          return { ...data, data: transformed };
        },
      },
    },
  });

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setReadFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasActiveFilters =
    search !== "" ||
    typeFilter !== "all" ||
    readFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const isEmptyResult =
    !table.refineCore.tableQuery.isLoading &&
    table.reactTable.getRowModel().rows.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Quản lý thông báo</CardTitle>
            <CardDescription>
              Xem và quản lý tất cả thông báo trong hệ thống
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              Bộ lọc
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Collapsible Filter Bar */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                {/* Notification Type Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Loại thông báo</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {NOTIFICATION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Read Status Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Trạng thái</label>
                  <Select value={readFilter} onValueChange={setReadFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="read">Đã đọc</SelectItem>
                      <SelectItem value="unread">Chưa đọc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Từ ngày</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Đến ngày</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[150px]"
                  />
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Data Table or Empty State */}
          {isEmptyResult ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <BellIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không có thông báo</EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                    : "Chưa có thông báo nào trong hệ thống"}
                </EmptyDescription>
              </EmptyHeader>
              {hasActiveFilters && (
                <EmptyContent>
                  <Button variant="outline" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <DataTable table={table} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
