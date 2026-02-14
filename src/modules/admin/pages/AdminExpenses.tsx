import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useCreate, useUpdate } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
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
  DropdownMenuSeparator,
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
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  SearchIcon,
  ReceiptIcon,
  MoreHorizontalIcon,
  Loader2Icon,
  AlertTriangleIcon,
  FilterIcon,
  PlusIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  context_type: string;
  group_id: string | null;
  group_name: string | null;
  paid_by_user_id: string;
  paid_by_name: string;
  paid_by_avatar: string | null;
  is_settled: boolean;
  created_at: string;
}

interface ExpenseSplit {
  id: string;
  user_id: string;
  user_name: string;
  split_method: string;
  computed_amount: number;
  is_settled: boolean;
  settled_amount: number;
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

// ─── Expense Detail Dialog ──────────────────────────────────────────

function ExpenseDetailDialog({
  expense,
  open,
  onOpenChange,
}: {
  expense: ExpenseRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(false);

  useEffect(() => {
    if (!expense || !open) {
      setSplits([]);
      return;
    }

    setLoadingSplits(true);
    supabaseClient
      .from("expense_splits")
      .select("*, profiles!expense_splits_user_id_fkey(full_name)")
      .eq("expense_id", expense.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setSplits(
            data.map((s: any) => ({
              id: s.id,
              user_id: s.user_id,
              user_name: s.profiles?.full_name ?? "Không rõ",
              split_method: s.split_method,
              computed_amount: s.computed_amount,
              is_settled: s.is_settled ?? false,
              settled_amount: s.settled_amount ?? 0,
            })),
          );
        }
        setLoadingSplits(false);
      });
  }, [expense?.id, open]);

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{expense.description}</DialogTitle>
          <DialogDescription>
            Chi tiết chi phí · {formatDate(expense.expense_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Số tiền" value={`${formatNumber(expense.amount)} ${expense.currency}`} />
            <DetailItem label="Người trả" value={expense.paid_by_name} />
            <DetailItem label="Nhóm" value={expense.group_name ?? "Bạn bè"} />
            <DetailItem
              label="Trạng thái"
              value={
                expense.is_settled ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                    Đã thanh toán
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                    Chờ xử lý
                  </Badge>
                )
              }
            />
          </div>

          {/* Splits Table */}
          <div>
            <h4 className="text-sm font-medium mb-2">Chia tiền</h4>
            {loadingSplits ? (
              <div className="flex items-center justify-center py-6">
                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : splits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có dữ liệu chia tiền
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người</TableHead>
                      <TableHead>Phương thức</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {splits.map((split) => (
                      <TableRow key={split.id}>
                        <TableCell className="text-sm">{split.user_name}</TableCell>
                        <TableCell className="text-sm capitalize">{split.split_method}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm">
                          {formatNumber(split.computed_amount)}
                        </TableCell>
                        <TableCell>
                          {split.is_settled ? (
                            <Badge variant="secondary" className="text-xs">Đã trả</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Chưa trả</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
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

// ─── Delete Confirmation Dialog ─────────────────────────────────────

function DeleteExpenseDialog({
  expense,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  expense: ExpenseRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!expense) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa chi phí &ldquo;{expense.description}&rdquo;
            ({formatNumber(expense.amount)} {expense.currency})?
            Chi phí sẽ được soft-delete và có thể khôi phục sau.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Create Expense Dialog ───────────────────────────────────────────

function CreateExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    description: string;
    amount: number;
    currency: string;
    expense_date: string;
    group_id: string | null;
    paid_by_user_id: string;
  }) => void;
  isCreating: boolean;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [groupId, setGroupId] = useState<string>("none");
  const [paidByUserId, setPaidByUserId] = useState("");

  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabaseClient.from("profiles").select("id, full_name").order("full_name"),
      supabaseClient.from("groups").select("id, name").order("name"),
    ]).then(([profilesRes, groupsRes]) => {
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (groupsRes.data) setGroupsList(groupsRes.data);
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setDescription("");
      setAmount("");
      setCurrency("VND");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setGroupId("none");
      setPaidByUserId("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!description || !amount || !paidByUserId || !expenseDate) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    onSubmit({
      description,
      amount: Number(amount),
      currency,
      expense_date: expenseDate,
      group_id: groupId === "none" ? null : groupId,
      paid_by_user_id: paidByUserId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo chi phí mới</DialogTitle>
          <DialogDescription>Thêm chi phí mới vào hệ thống</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="exp-desc">Mô tả</Label>
            <Input id="exp-desc" placeholder="Mô tả chi phí..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Số tiền</Label>
              <Input id="exp-amount" type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-currency">Tiền tệ</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="exp-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">VND</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-date">Ngày chi</Label>
            <Input id="exp-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-paid-by">Người trả</Label>
            <Select value={paidByUserId} onValueChange={setPaidByUserId}>
              <SelectTrigger id="exp-paid-by"><SelectValue placeholder="Chọn người trả" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-group">Nhóm (tùy chọn)</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="exp-group"><SelectValue placeholder="Không có nhóm" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không có nhóm (Bạn bè)</SelectItem>
                {groupsList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isCreating || !description || !amount || !paidByUserId}>
            {isCreating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tạo chi phí
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Expense Dialog ────────────────────────────────────────────

function EditExpenseDialog({
  expense,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
}: {
  expense: ExpenseRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { description: string; amount: number; expense_date: string; group_id: string | null }) => void;
  isUpdating: boolean;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [groupId, setGroupId] = useState<string>("none");
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (expense && open) {
      setDescription(expense.description);
      setAmount(String(expense.amount));
      setExpenseDate(expense.expense_date?.split("T")[0] ?? "");
      setGroupId(expense.group_id ?? "none");
      supabaseClient.from("groups").select("id, name").order("name").then(({ data }) => {
        if (data) setGroupsList(data);
      });
    }
  }, [expense, open]);

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa chi phí</DialogTitle>
          <DialogDescription>Cập nhật thông tin chi phí (không thay đổi chia tiền)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-exp-desc">Mô tả</Label>
            <Input id="edit-exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-exp-amount">Số tiền</Label>
            <Input id="edit-exp-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-exp-date">Ngày chi</Label>
            <Input id="edit-exp-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-exp-group">Nhóm</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="edit-exp-group"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không có nhóm (Bạn bè)</SelectItem>
                {groupsList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Hủy</Button>
          <Button onClick={() => onSubmit({ description, amount: Number(amount), expense_date: expenseDate, group_id: groupId === "none" ? null : groupId })} disabled={isUpdating || !description || !amount}>
            {isUpdating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row Actions ────────────────────────────────────────────────────

function RowActions({
  onViewDetail,
  onEdit,
  onDelete,
}: {
  onViewDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon className="mr-2 h-4 w-4" />
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          Xóa chi phí
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminExpenses() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const createMutation = useCreate();

  // Edit state
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateMutation = useUpdate();

  // Fetch groups for filter dropdown
  const { query: groupsQuery } = useList({
    resource: "groups",
    pagination: { pageSize: 200 },
    meta: { select: "id, name" },
  });
  const groups = groupsQuery.data?.data ?? [];

  // Build filters for Refine useTable
  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    // Filter out payment records (is_payment expenses are settlement records)
    f.push({ field: "is_payment", operator: "eq", value: false });
    if (debouncedSearch) {
      f.push({ field: "description", operator: "contains", value: debouncedSearch });
    }
    if (groupFilter !== "all") {
      f.push({ field: "group_id", operator: "eq", value: groupFilter });
    }
    if (dateFrom) {
      f.push({ field: "expense_date", operator: "gte", value: dateFrom });
    }
    if (dateTo) {
      f.push({ field: "expense_date", operator: "lte", value: dateTo });
    }
    if (amountMin) {
      f.push({ field: "amount", operator: "gte", value: Number(amountMin) });
    }
    if (amountMax) {
      f.push({ field: "amount", operator: "lte", value: Number(amountMax) });
    }
    return f;
  }, [debouncedSearch, groupFilter, dateFrom, dateTo, amountMin, amountMax]);

  // ─── Column Definitions ─────────────────────────────────────────

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(
    () => [
      {
        id: "description",
        header: "Mô tả",
        accessorKey: "description",
        size: 200,
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
        id: "paid_by",
        header: "Người trả",
        accessorKey: "paid_by_name",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={row.original.paid_by_avatar ?? undefined}
                alt={row.original.paid_by_name}
              />
              <AvatarFallback className="text-xs">
                {row.original.paid_by_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.paid_by_name}</span>
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
        id: "expense_date",
        header: "Ngày",
        accessorKey: "expense_date",
        size: 110,
        cell: ({ getValue }) => formatDate(getValue() as string),
      },
      {
        id: "status",
        header: "Trạng thái",
        accessorKey: "is_settled",
        size: 130,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.is_settled ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
              Đã thanh toán
            </Badge>
          ) : (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
              Chờ xử lý
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
              setSelectedExpense(row.original);
              setDetailOpen(true);
            }}
            onEdit={() => {
              setEditExpense(row.original);
              setEditDialogOpen(true);
            }}
            onDelete={() => {
              setDeleteExpense(row.original);
              setDeleteDialogOpen(true);
            }}
          />
        ),
      },
    ],
    [],
  );

  // ─── Table Setup ────────────────────────────────────────────────

  const table = useTable<ExpenseRow>({
    columns,
    refineCoreProps: {
      resource: "expenses",
      meta: {
        select: "*, profiles!expenses_paid_by_user_id_fkey(full_name, avatar_url), groups(name), expense_splits(is_settled)",
      },
      pagination: { pageSize: 10 },
      filters: {
        permanent: filters as any,
      },
      sorters: {
        initial: [{ field: "expense_date", order: "desc" }],
      },
      queryOptions: {
        select: (data) => {
          const transformed = data.data.map((expense: any) => {
            // Determine settlement status: all splits settled = settled
            const splits = expense.expense_splits ?? [];
            const allSettled = splits.length > 0 && splits.every((s: any) => s.is_settled);

            return {
              id: expense.id,
              description: expense.description ?? "",
              amount: expense.amount ?? 0,
              currency: expense.currency ?? "VND",
              expense_date: expense.expense_date,
              context_type: expense.context_type,
              group_id: expense.group_id,
              group_name: expense.groups?.name ?? null,
              paid_by_user_id: expense.paid_by_user_id,
              paid_by_name: expense.profiles?.full_name ?? "Không rõ",
              paid_by_avatar: expense.profiles?.avatar_url ?? null,
              is_settled: allSettled,
              created_at: expense.created_at,
            };
          });

          // Client-side status filter
          const filtered =
            statusFilter === "all"
              ? transformed
              : statusFilter === "settled"
                ? transformed.filter((e: ExpenseRow) => e.is_settled)
                : transformed.filter((e: ExpenseRow) => !e.is_settled);

          return {
            ...data,
            data: filtered,
            total: statusFilter === "all" ? data.total : filtered.length,
          };
        },
      },
    },
  });

  // ─── Delete Handler ─────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteExpense) return;

    setIsDeleting(true);
    try {
      const { error } = await supabaseClient.rpc("soft_delete_expense", {
        p_expense_id: deleteExpense.id,
      });

      if (error) throw error;

      toast.success(`Đã xóa chi phí "${deleteExpense.description}"`);
      setDeleteDialogOpen(false);
      setDeleteExpense(null);
      table.refineCore.tableQuery.refetch();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể xóa chi phí"}`);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteExpense, table.refineCore.tableQuery]);

  // ─── Create Handler ─────────────────────────────────────────────

  const handleCreate = useCallback(
    (data: { description: string; amount: number; currency: string; expense_date: string; group_id: string | null; paid_by_user_id: string }) => {
      setIsCreating(true);
      createMutation.mutate(
        {
          resource: "expenses",
          values: {
            description: data.description,
            amount: data.amount,
            currency: data.currency,
            expense_date: data.expense_date,
            group_id: data.group_id,
            paid_by_user_id: data.paid_by_user_id,
            context_type: data.group_id ? "group" : "friend",
            is_payment: false,
          },
        },
        {
          onSuccess: () => {
            toast.success("Đã tạo chi phí mới");
            setCreateDialogOpen(false);
            setIsCreating(false);
            table.refineCore.tableQuery.refetch();
          },
          onError: (error) => {
            toast.error(`Lỗi: ${error.message}`);
            setIsCreating(false);
          },
        },
      );
    },
    [createMutation, table.refineCore.tableQuery],
  );

  // ─── Edit Handler ──────────────────────────────────────────────

  const handleEdit = useCallback(
    (data: { description: string; amount: number; expense_date: string; group_id: string | null }) => {
      if (!editExpense) return;
      setIsUpdating(true);
      updateMutation.mutate(
        {
          resource: "expenses",
          id: editExpense.id,
          values: {
            description: data.description,
            amount: data.amount,
            expense_date: data.expense_date,
            group_id: data.group_id,
            context_type: data.group_id ? "group" : "friend",
          },
        },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật chi phí");
            setEditDialogOpen(false);
            setEditExpense(null);
            setIsUpdating(false);
            table.refineCore.tableQuery.refetch();
          },
          onError: (error) => {
            toast.error(`Lỗi: ${error.message}`);
            setIsUpdating(false);
          },
        },
      );
    },
    [editExpense, updateMutation, table.refineCore.tableQuery],
  );

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
    setGroupFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
  }, []);

  const hasActiveFilters =
    search !== "" ||
    groupFilter !== "all" ||
    statusFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    amountMin !== "" ||
    amountMax !== "";

  const isEmptyResult =
    !table.refineCore.tableQuery.isLoading &&
    table.reactTable.getRowModel().rows.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Quản lý chi phí</CardTitle>
            <CardDescription>
              Xem và quản lý tất cả chi phí trong hệ thống
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Tạo chi phí
            </Button>
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
              placeholder="Tìm kiếm theo mô tả..."
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

                {/* Status Filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Trạng thái</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="settled">Đã thanh toán</SelectItem>
                      <SelectItem value="pending">Chờ xử lý</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Số tiền từ</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    className="w-[120px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Số tiền đến</label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    className="w-[120px]"
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
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <ReceiptIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không tìm thấy chi phí</EmptyTitle>
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

      {/* Expense Detail Dialog */}
      <ExpenseDetailDialog
        expense={selectedExpense}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteExpenseDialog
        expense={deleteExpense}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteDialogOpen(false);
            setDeleteExpense(null);
          }
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {/* Create Expense Dialog */}
      <CreateExpenseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isCreating={isCreating}
      />

      {/* Edit Expense Dialog */}
      <EditExpenseDialog
        expense={editExpense}
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isUpdating) {
            setEditDialogOpen(false);
            setEditExpense(null);
          }
        }}
        onSubmit={handleEdit}
        isUpdating={isUpdating}
      />
    </div>
  );
}
