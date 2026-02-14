import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useList } from "@refinedev/core";

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
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import type { AuditLogEntry } from "../types";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ACTION_TYPES = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "settle_all",
  "settle_single",
  "create_settlement_payment",
] as const;

// ─── Debounce Hook ──────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Action Type Badge ──────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const isDestructive = action === "DELETE";
  const isInsert = action === "INSERT";

  if (isDestructive) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
        {action}
      </Badge>
    );
  }
  if (isInsert) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
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

// ─── Detail Dialog ──────────────────────────────────────────────────

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
  const source = entry.table_name ? "audit_logs" : "audit_trail";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActionBadge action={entry.action_type} />
            <span>{entry.table_name ?? entry.entity_type ?? "—"}</span>
          </DialogTitle>
          <DialogDescription>
            {formatDate(entry.timestamp)} · {entry.actor_name || entry.actor_email || "System"} · Nguồn: {source}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Người thực hiện" value={entry.actor_name || entry.actor_email || "System"} />
              <DetailItem label="Email" value={entry.actor_email || "—"} />
              <DetailItem label="Loại thao tác" value={entry.action_type} />
              <DetailItem label="Bảng/Thực thể" value={entry.table_name ?? entry.entity_type ?? "—"} />
              <DetailItem label="Entity ID" value={entry.entity_id || "—"} />
              <DetailItem label="Thời gian" value={formatDate(entry.timestamp)} />
            </div>

            {/* Old/New Data for audit_logs */}
            {hasOldNewData && (
              <div className="space-y-3">
                {entry.old_data && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Dữ liệu cũ</h4>
                    <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(entry.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {entry.new_data && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Dữ liệu mới</h4>
                    <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(entry.new_data, null, 2)}
                    </pre>
                  </div>
                )}
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

            {/* No extra data */}
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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ─── Fetch audit_logs via Refine useList ────────────────────────

  const { query: auditLogsQuery } = useList<any>({
    resource: "audit_logs",
    pagination: { pageSize: 100 },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select: "*, profiles!audit_logs_user_id_fkey(full_name, email)",
    },
  });
  const auditLogsData = auditLogsQuery.data;
  const logsLoading = auditLogsQuery.isLoading;

  // ─── Fetch audit_trail via RPC ──────────────────────────────────

  const { data: auditTrailData, isLoading: trailLoading } = useQuery({
    queryKey: ["admin", "audit-trail-full"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("read_audit_trail", {
        p_limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        actor: string;
        actor_name: string | null;
        actor_email: string | null;
        action_timestamp: string;
        action_type: string;
        entity_id: string;
        entity_type: string;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
    staleTime: 30_000,
  });

  // ─── Merge & Transform ──────────────────────────────────────────

  const mergedEntries = useMemo<AuditLogEntry[]>(() => {
    const fromLogs: AuditLogEntry[] = (auditLogsData?.data ?? []).map((log: any) => ({
      id: `log-${log.id}`,
      timestamp: log.created_at,
      actor_name: log.profiles?.full_name ?? "Không rõ",
      actor_email: log.profiles?.email ?? "",
      action_type: log.action,
      table_name: log.table_name,
      entity_id: log.record_id,
      old_data: log.old_data,
      new_data: log.new_data,
    }));

    const fromTrail: AuditLogEntry[] = (auditTrailData ?? []).map((trail) => ({
      id: `trail-${trail.id}`,
      timestamp: trail.action_timestamp ?? trail.created_at,
      actor_name: trail.actor_name ?? "Không rõ",
      actor_email: trail.actor_email ?? "",
      action_type: trail.action_type,
      entity_type: trail.entity_type,
      entity_id: trail.entity_id,
      metadata: trail.metadata ?? undefined,
    }));

    const all = [...fromLogs, ...fromTrail];
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return all;
  }, [auditLogsData?.data, auditTrailData]);

  // ─── Derive unique values for filter dropdowns ──────────────────

  const uniqueTables = useMemo(() => {
    const set = new Set<string>();
    for (const e of mergedEntries) {
      const val = e.table_name ?? e.entity_type;
      if (val) set.add(val);
    }
    return Array.from(set).sort();
  }, [mergedEntries]);

  const uniqueActors = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of mergedEntries) {
      const key = e.actor_email || e.actor_name;
      if (key && !map.has(key)) {
        map.set(key, e.actor_name || e.actor_email);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [mergedEntries]);

  // ─── Client-side filtering ──────────────────────────────────────

  const filteredEntries = useMemo(() => {
    let result = mergedEntries;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.actor_name.toLowerCase().includes(q) ||
          e.actor_email.toLowerCase().includes(q) ||
          e.action_type.toLowerCase().includes(q) ||
          (e.table_name ?? "").toLowerCase().includes(q) ||
          (e.entity_type ?? "").toLowerCase().includes(q) ||
          e.entity_id.toLowerCase().includes(q),
      );
    }

    if (actionFilter !== "all") {
      result = result.filter((e) => e.action_type === actionFilter);
    }

    if (tableFilter !== "all") {
      result = result.filter((e) => (e.table_name ?? e.entity_type) === tableFilter);
    }

    if (actorFilter !== "all") {
      result = result.filter((e) => (e.actor_email || e.actor_name) === actorFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() <= to);
    }

    return result;
  }, [mergedEntries, debouncedSearch, actionFilter, tableFilter, actorFilter, dateFrom, dateTo]);

  // ─── Pagination ─────────────────────────────────────────────────

  const [page, setPage] = useState(0);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, actionFilter, tableFilter, actorFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

  const isLoading = logsLoading || trailLoading;
  const isEmptyResult = !isLoading && filteredEntries.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {!isLoading && mergedEntries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Tổng nhật ký</div>
            <div className="text-xl font-semibold mt-1">{filteredEntries.length}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">INSERT</div>
            <div className="text-xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
              {filteredEntries.filter(e => e.action_type === "INSERT").length}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">UPDATE</div>
            <div className="text-xl font-semibold mt-1 text-violet-600 dark:text-violet-400">
              {filteredEntries.filter(e => e.action_type === "UPDATE").length}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">DELETE</div>
            <div className="text-xl font-semibold mt-1 text-red-600 dark:text-red-400">
              {filteredEntries.filter(e => e.action_type === "DELETE").length}
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Nhật ký kiểm toán</CardTitle>
            <CardDescription>
              Dữ liệu từ audit_logs và audit_trail
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
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{
                  [actionFilter !== "all", tableFilter !== "all", actorFilter !== "all", dateFrom, dateTo, search].filter(Boolean).length
                }</Badge>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên, email, thao tác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Collapsible Filter Bar */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
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

                {/* Action Type Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Loại thao tác</label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Table/Entity Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Bảng dữ liệu</label>
                  <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {uniqueTables.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actor Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Người thực hiện</label>
                  <Select value={actorFilter} onValueChange={setActorFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {uniqueActors.map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
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

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty State */}
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
                  <Button variant="outline" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )}

          {/* Data Table */}
          {!isLoading && filteredEntries.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[160px]">Thời gian</TableHead>
                      <TableHead className="w-[180px]">Người thực hiện</TableHead>
                      <TableHead className="w-[140px]">Loại thao tác</TableHead>
                      <TableHead className="w-[140px]">Bảng/Thực thể</TableHead>
                      <TableHead>Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedEntries.map((entry) => (
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
                            <div className="min-w-0">
                              <span className="text-sm truncate block max-w-[120px]">
                                {entry.actor_name || entry.actor_email || "System"}
                              </span>
                            </div>
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
                  Hiển thị {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredEntries.length)} / {filteredEntries.length} kết quả
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Trước
                  </Button>
                  <span className="text-sm">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <AuditDetailDialog
        entry={selectedEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function getDetailSummary(entry: AuditLogEntry): string {
  if (entry.old_data || entry.new_data) {
    const keys = Object.keys(entry.new_data ?? entry.old_data ?? {});
    if (keys.length === 0) return `Record ${entry.entity_id}`;
    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}`;
  }
  if (entry.metadata) {
    const keys = Object.keys(entry.metadata);
    if (keys.length === 0) return `Entity ${entry.entity_id}`;
    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}`;
  }
  return entry.entity_id || "—";
}
