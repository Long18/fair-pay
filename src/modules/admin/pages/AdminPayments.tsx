import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useList } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  CreditCardIcon,
  MoreHorizontalIcon,
  FilterIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface PaymentRow {
  id: string;
  from_user_id: string;
  from_user_name: string;
  from_user_avatar: string | null;
  to_user_id: string;
  to_user_name: string;
  to_user_avatar: string | null;
  amount: number;
  currency: string;
  context_type: string;
  group_id: string | null;
  group_name: string | null;
  payment_date: string;
  note: string | null;
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

// ─── Payment Detail Sheet ───────────────────────────────────────────

function PaymentDetailSheet({
  payment,
  open,
  onOpenChange,
}: {
  payment: PaymentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!payment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Chi tiết thanh toán</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {formatDate(payment.payment_date)}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Sender */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={payment.from_user_avatar ?? undefined} alt={payment.from_user_name} />
              <AvatarFallback>{payment.from_user_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-xs text-muted-foreground">Người gửi</span>
              <p className="text-sm font-medium">{payment.from_user_name}</p>
            </div>
          </div>

          {/* Receiver */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={payment.to_user_avatar ?? undefined} alt={payment.to_user_name} />
              <AvatarFallback>{payment.to_user_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-xs text-muted-foreground">Người nhận</span>
              <p className="text-sm font-medium">{payment.to_user_name}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <DetailRow
              label="Số tiền"
              value={
                <span className="font-mono tabular-nums font-medium">
                  {formatNumber(payment.amount)} {payment.currency}
                </span>
              }
            />
            <DetailRow
              label="Nhóm/Bạn bè"
              value={payment.group_name ?? "Bạn bè"}
            />
            <DetailRow
              label="Phương thức"
              value={
                <Badge className={
                  payment.context_type === "group"
                    ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                }>
                  {payment.context_type === "group" ? "Nhóm" : "Bạn bè"}
                </Badge>
              }
            />
            <DetailRow label="Ngày thanh toán" value={formatDate(payment.payment_date)} />
            <DetailRow label="Ngày tạo" value={formatDate(payment.created_at)} />
            {payment.note && <DetailRow label="Ghi chú" value={payment.note} />}
            <DetailRow label="ID" value={payment.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ─── Row Actions ────────────────────────────────────────────────────

function RowActions({ onViewDetail }: { onViewDetail: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewDetail}>
          Xem chi tiết
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminPayments() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [senderFilter, setSenderFilter] = useState<string>("all");
  const [receiverFilter, setReceiverFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch groups for filter dropdown
  const { query: groupsQuery } = useList({
    resource: "groups",
    pagination: { pageSize: 200 },
    meta: { select: "id, name" },
  });
  const groups = groupsQuery.data?.data ?? [];

  // Fetch profiles for sender/receiver filter dropdowns
  const { query: profilesQuery } = useList({
    resource: "profiles",
    pagination: { pageSize: 200 },
    meta: { select: "id, full_name" },
  });
  const profiles = profilesQuery.data?.data ?? [];

  // Build filters for Refine useTable
  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (debouncedSearch) {
      f.push({ field: "note", operator: "contains", value: debouncedSearch });
    }
    if (groupFilter !== "all") {
      f.push({ field: "group_id", operator: "eq", value: groupFilter });
    }
    if (senderFilter !== "all") {
      f.push({ field: "from_user", operator: "eq", value: senderFilter });
    }
    if (receiverFilter !== "all") {
      f.push({ field: "to_user", operator: "eq", value: receiverFilter });
    }
    if (dateFrom) {
      f.push({ field: "payment_date", operator: "gte", value: dateFrom });
    }
    if (dateTo) {
      f.push({ field: "payment_date", operator: "lte", value: dateTo });
    }
    return f;
  }, [debouncedSearch, groupFilter, senderFilter, receiverFilter, dateFrom, dateTo]);

  // ─── Column Definitions ─────────────────────────────────────────

  const columns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        id: "from_user",
        header: "Người gửi",
        accessorKey: "from_user_name",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={row.original.from_user_avatar ?? undefined}
                alt={row.original.from_user_name}
              />
              <AvatarFallback className="text-xs">
                {row.original.from_user_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.from_user_name}</span>
          </div>
        ),
      },
      {
        id: "to_user",
        header: "Người nhận",
        accessorKey: "to_user_name",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={row.original.to_user_avatar ?? undefined}
                alt={row.original.to_user_name}
              />
              <AvatarFallback className="text-xs">
                {row.original.to_user_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.to_user_name}</span>
          </div>
        ),
      },
      {
        id: "amount",
        header: () => <div className="text-right">Số tiền</div>,
        accessorKey: "amount",
        size: 140,
        cell: ({ row }) => (
          <div className="text-right font-mono tabular-nums">
            {formatNumber(row.original.amount)}
          </div>
        ),
      },
      {
        id: "group",
        header: "Nhóm/Bạn bè",
        accessorKey: "group_name",
        size: 140,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.group_name ?? "Bạn bè"}
          </span>
        ),
      },
      {
        id: "payment_date",
        header: "Ngày",
        accessorKey: "payment_date",
        size: 110,
        cell: ({ getValue }) => formatDate(getValue() as string),
      },
      {
        id: "context_type",
        header: "Phương thức",
        accessorKey: "context_type",
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <Badge className={
            row.original.context_type === "group"
              ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
          }>
            {row.original.context_type === "group" ? "Nhóm" : "Bạn bè"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            onViewDetail={() => {
              setSelectedPayment(row.original);
              setSheetOpen(true);
            }}
          />
        ),
      },
    ],
    [],
  );

  // ─── Table Setup ────────────────────────────────────────────────

  const table = useTable<PaymentRow>({
    columns,
    refineCoreProps: {
      resource: "payments",
      meta: {
        select: "*, from:profiles!payments_from_user_fkey(full_name, avatar_url), to:profiles!payments_to_user_fkey(full_name, avatar_url), groups(name)",
      },
      pagination: { pageSize: 10 },
      filters: {
        permanent: filters as any,
      },
      sorters: {
        initial: [{ field: "payment_date", order: "desc" }],
      },
      queryOptions: {
        select: (data) => {
          const transformed = data.data.map((payment: any) => ({
            id: payment.id,
            from_user_id: payment.from_user,
            from_user_name: payment.from?.full_name ?? "Không rõ",
            from_user_avatar: payment.from?.avatar_url ?? null,
            to_user_id: payment.to_user,
            to_user_name: payment.to?.full_name ?? "Không rõ",
            to_user_avatar: payment.to?.avatar_url ?? null,
            amount: payment.amount ?? 0,
            currency: payment.currency ?? "VND",
            context_type: payment.context_type,
            group_id: payment.group_id,
            group_name: payment.groups?.name ?? null,
            payment_date: payment.payment_date,
            note: payment.note,
            created_at: payment.created_at,
          }));

          return { ...data, data: transformed };
        },
      },
    },
  });

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
    setGroupFilter("all");
    setSenderFilter("all");
    setReceiverFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasActiveFilters =
    search !== "" ||
    groupFilter !== "all" ||
    senderFilter !== "all" ||
    receiverFilter !== "all" ||
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
            <CardTitle>Quản lý thanh toán</CardTitle>
            <CardDescription>
              Xem tất cả thanh toán trong hệ thống
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
              placeholder="Tìm kiếm theo ghi chú..."
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

                {/* Group Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nhóm</label>
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả nhóm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả nhóm</SelectItem>
                      {groups.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sender Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Người gửi</label>
                  <Select value={senderFilter} onValueChange={setSenderFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {profiles.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Receiver Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Người nhận</label>
                  <Select value={receiverFilter} onValueChange={setReceiverFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {profiles.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
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

          {/* Data Table or Empty State */}
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <CreditCardIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không tìm thấy thanh toán</EmptyTitle>
                <EmptyDescription>
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <DataTable table={table} />
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Sheet */}
      <PaymentDetailSheet
        payment={selectedPayment}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
