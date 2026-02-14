import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ScrollTextIcon,
  FilterIcon,
  Loader2Icon,
  DownloadIcon,
  RefreshCwIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import type { AuditLogEntry, AuditLogsResponse, AuditStats, AuditFilterOptions } from "../types";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Hooks ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useAuditLogs(params: {
  search: string;
  actionFilter: string;
  tableFilter: string;
  actorFilter: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}) {
  return useQuery<AuditLogsResponse>({
    queryKey: ["admin", "audit-logs", params],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("read_admin_audit_logs", {
        p_search: params.search || null,
        p_action_type: params.actionFilter !== "all" ? params.actionFilter : null,
        p_table_name: params.tableFilter !== "all" ? params.tableFilter : null,
        p_actor_id: params.actorFilter !== "all" ? params.actorFilter : null,
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo ? new Date(params.dateTo + "T23:59:59").toISOString() : null,
        p_limit: PAGE_SIZE,
        p_offset: params.page * PAGE_SIZE,
      });
      if (error) throw error;
      return data as AuditLogsResponse;
    },
    staleTime: 15_000,
  });
}

function useAuditStats() {
  return useQuery<AuditStats>({
    queryKey: ["admin", "audit-stats"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_audit_stats");
      if (error) throw error;
      return data as AuditStats;
    },
    staleTime: 30_000,
  });
}

function useAuditFilterOptions() {
  return useQuery<AuditFilterOptions>({
    queryKey: ["admin", "audit-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_audit_filter_options");
      if (error) throw error;
      return data as AuditFilterOptions;
    },
    staleTime: 60_000,
  });
}


// ─── Action Badge ───────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  if (action === "DELETE") {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
        {action}
      </Badge>
    );
  }
  if (action === "INSERT") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
        {action}
      </Badge>
    );
  }
  if (action === "UPDATE") {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
        {action}
      </Badge>
    );
  }
  return (
    <Badge className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800">
      {action.replace(/_/g, " ")}
    </Badge>
  );
}

// ─── Diff View ──────────────────────────────────────────────────────

function DiffView({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const changes = useMemo(() => {
    if (!oldData && !newData) return [];

    const allKeys = new Set([
      ...Object.keys(oldData ?? {}),
      ...Object.keys(newData ?? {}),
    ]);

    const result: Array<{
      key: string;
      oldVal: unknown;
      newVal: unknown;
      type: "added" | "removed" | "changed" | "unchanged";
    }> = [];

    for (const key of allKeys) {
      const oldVal = oldData?.[key];
      const newVal = newData?.[key];
      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);

      if (oldVal === undefined) {
        result.push({ key, oldVal, newVal, type: "added" });
      } else if (newVal === undefined) {
        result.push({ key, oldVal, newVal, type: "removed" });
      } else if (oldStr !== newStr) {
        result.push({ key, oldVal, newVal, type: "changed" });
      } else {
        result.push({ key, oldVal, newVal, type: "unchanged" });
      }
    }

    // Sort: changed first, then added, removed, unchanged
    const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
    result.sort((a, b) => order[a.type] - order[b.type]);
    return result;
  }, [oldData, newData]);

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Không có dữ liệu chi tiết</p>;
  }

  const formatVal = (v: unknown) => {
    if (v === undefined || v === null) return "—";
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    return String(v);
  };

  return (
    <div className="space-y-1">
      {changes.map(({ key, oldVal, newVal, type }) => (
        <div
          key={key}
          className={`flex items-start gap-2 rounded-md px-2 py-1 text-xs font-mono ${
            type === "added"
              ? "bg-emerald-50 dark:bg-emerald-950/30"
              : type === "removed"
                ? "bg-red-50 dark:bg-red-950/30"
                : type === "changed"
                  ? "bg-amber-50 dark:bg-amber-950/30"
                  : "bg-transparent"
          }`}
        >
          <span className="w-1.5 shrink-0 mt-0.5">
            {type === "added" && <span className="text-emerald-600">+</span>}
            {type === "removed" && <span className="text-red-600">−</span>}
            {type === "changed" && <span className="text-amber-600">~</span>}
          </span>
          <span className="text-muted-foreground min-w-[100px] shrink-0">{key}:</span>
          <div className="flex-1 min-w-0">
            {type === "changed" ? (
              <div className="space-y-0.5">
                <div className="text-red-600 dark:text-red-400 line-through break-all">{formatVal(oldVal)}</div>
                <div className="text-emerald-600 dark:text-emerald-400 break-all">{formatVal(newVal)}</div>
              </div>
            ) : type === "removed" ? (
              <span className="text-red-600 dark:text-red-400 break-all">{formatVal(oldVal)}</span>
            ) : type === "added" ? (
              <span className="text-emerald-600 dark:text-emerald-400 break-all">{formatVal(newVal)}</span>
            ) : (
              <span className="text-muted-foreground break-all">{formatVal(newVal)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── Detail Dialog ──────────────────────────────────────────────────

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function AuditDetailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;

  const hasOldNewData = entry.old_data || entry.new_data;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActionBadge action={entry.action_type} />
            <span>{entry.table_name ?? entry.entity_type ?? "—"}</span>
          </DialogTitle>
          <DialogDescription>
            {formatDate(entry.timestamp)} · {entry.actor_name || entry.actor_email || "System"} · Nguồn: {entry.source}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Người thực hiện" value={entry.actor_name || entry.actor_email || "System"} />
              <DetailItem label="Email" value={entry.actor_email || "—"} />
              <DetailItem label="Loại thao tác" value={entry.action_type} />
              <DetailItem label="Bảng/Thực thể" value={entry.table_name ?? entry.entity_type ?? "—"} />
              <DetailItem label="Entity ID" value={<span className="font-mono text-xs">{entry.entity_id || "—"}</span>} />
              <DetailItem label="Thời gian" value={formatDate(entry.timestamp)} />
              <DetailItem label="Nguồn" value={
                <Badge variant="outline" className="text-xs">
                  {entry.source === "audit_logs" ? "Thay đổi dữ liệu" : "Settlement"}
                </Badge>
              } />
            </div>

            {/* Diff View for old/new data */}
            {hasOldNewData && (
              <div>
                <h4 className="text-sm font-medium mb-2">Thay đổi dữ liệu</h4>
                <DiffView oldData={entry.old_data} newData={entry.new_data} />
              </div>
            )}

            {/* Metadata for audit_trail */}
            {hasMetadata && (
              <div>
                <h4 className="text-sm font-medium mb-1">Metadata</h4>
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            )}

            {!hasOldNewData && !hasMetadata && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có dữ liệu chi tiết
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


// ─── Export CSV ─────────────────────────────────────────────────────

function exportToCsv(entries: AuditLogEntry[]) {
  const headers = ["Thời gian", "Người thực hiện", "Email", "Loại thao tác", "Bảng", "Entity ID", "Nguồn"];
  const rows = entries.map((e) => [
    e.timestamp,
    e.actor_name || "System",
    e.actor_email || "",
    e.action_type,
    e.table_name ?? e.entity_type ?? "",
    e.entity_id,
    e.source,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}


// ─── Main Component ─────────────────────────────────────────────────

export function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, actionFilter, tableFilter, actorFilter, dateFrom, dateTo]);

  // ─── Data fetching ──────────────────────────────────────────────

  const { data: logsResponse, isLoading, refetch, isFetching } = useAuditLogs({
    search: debouncedSearch,
    actionFilter,
    tableFilter,
    actorFilter,
    dateFrom,
    dateTo,
    page,
  });

  const { data: stats, isLoading: statsLoading } = useAuditStats();
  const { data: filterOptions } = useAuditFilterOptions();

  const entries = logsResponse?.data ?? [];
  const total = logsResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
    setActionFilter("all");
    setTableFilter("all");
    setActorFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasActiveFilters =
    search !== "" ||
    actionFilter !== "all" ||
    tableFilter !== "all" ||
    actorFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const isEmptyResult = !isLoading && entries.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Tổng nhật ký</div>
            <div className="text-xl font-semibold mt-1">{stats.total.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">INSERT</div>
            <div className="text-xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
              {stats.inserts.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">UPDATE</div>
            <div className="text-xl font-semibold mt-1 text-amber-600 dark:text-amber-400">
              {stats.updates.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">DELETE</div>
            <div className="text-xl font-semibold mt-1 text-red-600 dark:text-red-400">
              {stats.deletes.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Hôm nay</div>
            <div className="text-xl font-semibold mt-1 text-blue-600 dark:text-blue-400">
              {stats.today.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Tuần này</div>
            <div className="text-xl font-semibold mt-1 text-violet-600 dark:text-violet-400">
              {stats.this_week.toLocaleString()}
            </div>
          </Card>
        </div>
      )}


      {/* Analytics: by table + by actor */}
      {!statsLoading && stats && (stats.by_table.length > 0 || stats.by_actor.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.by_table.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Theo bảng dữ liệu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.by_table.map((item) => {
                  const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs min-w-[100px] justify-center">
                        {item.name}
                      </Badge>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {stats.by_actor.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Theo người thực hiện</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.by_actor.map((item) => {
                  const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="text-xs min-w-[100px] truncate">{item.name}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500/60 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}


      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Nhật ký kiểm toán</CardTitle>
            <CardDescription>
              Theo dõi toàn bộ thay đổi dữ liệu trong hệ thống
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCwIcon className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCsv(entries)}
              disabled={entries.length === 0}
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              Xuất CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              Bộ lọc
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {[actionFilter !== "all", tableFilter !== "all", actorFilter !== "all", dateFrom, dateTo, search].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên, email, thao tác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Collapsible Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Từ ngày</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Đến ngày</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Loại thao tác</label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {(filterOptions?.action_types ?? []).map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Bảng dữ liệu</label>
                  <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {(filterOptions?.tables ?? []).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Người thực hiện</label>
                  <Select value={actorFilter} onValueChange={setActorFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {(filterOptions?.actors ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>


          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty */}
          {isEmptyResult && (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <ScrollTextIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không tìm thấy nhật ký</EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                    : "Chưa có nhật ký kiểm toán nào trong hệ thống"}
                </EmptyDescription>
              </EmptyHeader>
              {hasActiveFilters && (
                <EmptyContent>
                  <Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button>
                </EmptyContent>
              )}
            </Empty>
          )}

          {/* Data Table */}
          {!isLoading && entries.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[160px]">Thời gian</TableHead>
                      <TableHead className="w-[180px]">Người thực hiện</TableHead>
                      <TableHead className="w-[100px]">Thao tác</TableHead>
                      <TableHead className="w-[130px]">Bảng</TableHead>
                      <TableHead className="w-[80px]">Nguồn</TableHead>
                      <TableHead>Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors group"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setDetailOpen(true);
                        }}
                      >
                        <TableCell className="text-sm font-mono text-muted-foreground tabular-nums">
                          {formatDate(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {(entry.actor_name || entry.actor_email || "?")[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate max-w-[120px]">
                              {entry.actor_name || entry.actor_email || "System"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={entry.action_type} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.table_name ?? entry.entity_type ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs ${entry.source === "audit_logs" ? "text-blue-600 dark:text-blue-400" : "text-violet-600 dark:text-violet-400"}`}>
                            {entry.source === "audit_logs" ? "DB" : "Trail"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] group-hover:text-foreground transition-colors">
                          {getDetailSummary(entry)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  Hiển thị {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total.toLocaleString()} kết quả
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Trước
                  </Button>
                  <span className="text-sm">{page + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <AuditDetailDialog entry={selectedEntry} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}


// ─── Helpers ────────────────────────────────────────────────────────

function getDetailSummary(entry: AuditLogEntry): string {
  if (entry.old_data || entry.new_data) {
    const data = entry.new_data ?? entry.old_data ?? {};
    const keys = Object.keys(data);
    if (keys.length === 0) return `Record ${entry.entity_id?.slice(0, 8) ?? "—"}`;

    // For UPDATE, show changed fields
    if (entry.action_type === "UPDATE" && entry.old_data && entry.new_data) {
      const changed = keys.filter(
        (k) => JSON.stringify(entry.old_data?.[k]) !== JSON.stringify(entry.new_data?.[k])
      );
      if (changed.length > 0) {
        return `Đổi: ${changed.slice(0, 3).join(", ")}${changed.length > 3 ? "…" : ""}`;
      }
    }

    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}`;
  }
  if (entry.metadata) {
    const keys = Object.keys(entry.metadata);
    if (keys.length === 0) return `Entity ${entry.entity_id?.slice(0, 8) ?? "—"}`;
    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}`;
  }
  return entry.entity_id?.slice(0, 8) || "—";
}
