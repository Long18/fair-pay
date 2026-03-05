import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
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
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ReceiptIcon,
  CreditCardIcon,
  MoreHorizontalIcon,
  FilterIcon,
  AlertTriangleIcon,
  Loader2Icon,
  PlusIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { MarkdownComment } from "@/modules/expenses/components/markdown-comment";
import { AttachmentList } from "@/modules/expenses/components/attachment-list";
import { Attachment } from "@/modules/expenses/types";
import { AdminCreateExpenseDialog } from "../components/AdminCreateExpenseDialog";
import { AdminEditExpenseDialog } from "../components/AdminEditExpenseDialog";
import { useHaptics } from "@/hooks/use-haptics";

// ─── Types ──────────────────────────────────────────────────────────

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
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

// ─── Shared Delete Confirm Dialog ───────────────────────────────────

function DeleteConfirmDialog({
  title, description, open, onOpenChange, onConfirm, isDeleting,
}: {
  title: string; description: string; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; isDeleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); onConfirm(); }} disabled={isDeleting}>
            {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ─── Expense Detail Dialog ──────────────────────────────────────────

function ExpenseDetailDialog({
  expense, open, onOpenChange, onEdit, onDelete,
}: {
  expense: ExpenseRow | null; open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void; onDelete: () => void;
}) {
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(false);
  const [comment, setComment] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (!expense || !open) { setSplits([]); setComment(null); setAttachments([]); return; }
    setLoadingSplits(true);

    // Fetch splits, comment, and attachments in parallel
    Promise.all([
      supabaseClient
        .from("expense_splits")
        .select("*, profiles!expense_splits_user_id_fkey(full_name)")
        .eq("expense_id", expense.id),
      supabaseClient
        .from("expenses")
        .select("comment")
        .eq("id", expense.id)
        .single(),
      supabaseClient
        .from("attachments")
        .select("*")
        .eq("expense_id", expense.id),
    ]).then(([splitsRes, commentRes, attachmentsRes]) => {
      if (!splitsRes.error && splitsRes.data) {
        setSplits(splitsRes.data.map((s: any) => ({
          id: s.id, user_id: s.user_id, user_name: s.profiles?.full_name ?? "Không rõ",
          split_method: s.split_method, computed_amount: s.computed_amount,
          is_settled: s.is_settled ?? false, settled_amount: s.settled_amount ?? 0,
        })));
      }
      if (!commentRes.error && commentRes.data) {
        setComment(commentRes.data.comment);
      }
      if (!attachmentsRes.error && attachmentsRes.data) {
        setAttachments(attachmentsRes.data);
      }
      setLoadingSplits(false);
    });
  }, [expense?.id, open]);

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{expense.description}</DialogTitle>
          <DialogDescription>Chi tiết chi phí · {formatDate(expense.expense_date)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Số tiền" value={`${formatNumber(expense.amount)} ${expense.currency}`} />
            <DetailItem label="Người trả" value={expense.paid_by_name} />
            <DetailItem label="Nhóm" value={expense.group_name ?? "Bạn bè"} />
            <DetailItem label="Danh mục" value={
              (() => {
                const cat = getCategoryMeta(expense.category);
                const CatIcon = cat.icon;
                return (
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded ${cat.bgColor}`}>
                      <CatIcon size={12} className={cat.color} />
                    </span>
                    <span>{cat.name}</span>
                  </div>
                );
              })()
            } />
            <DetailItem label="Trạng thái" value={
              expense.is_settled
                ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">Đã thanh toán</Badge>
                : <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">Chờ xử lý</Badge>
            } />
          </div>

          {/* Comment section - parity with Client show page */}
          {comment && comment.trim() !== "" && (
            <div>
              <h4 className="text-sm font-medium mb-2">Ghi chú</h4>
              <div className="rounded-md border p-3 bg-muted/30">
                <MarkdownComment content={comment} className="text-sm" />
              </div>
            </div>
          )}

          {/* Splits section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Chia tiền</h4>
            {loadingSplits ? (
              <div className="flex items-center justify-center py-6"><Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : splits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Không có dữ liệu chia tiền</p>
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
                        <TableCell className="text-right font-mono tabular-nums text-sm">{formatNumber(split.computed_amount)}</TableCell>
                        <TableCell>
                          {split.is_settled
                            ? <Badge variant="secondary" className="text-xs">Đã trả</Badge>
                            : <Badge variant="outline" className="text-xs">Chưa trả</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Attachments section - parity with Client show page */}
          {attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tệp đính kèm ({attachments.length})</h4>
              <AttachmentList attachments={attachments} canDelete={false} />
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />Chỉnh sửa</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>Xóa chi phí</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Detail Dialog (replaces Sheet) ─────────────────────────

function PaymentDetailDialog({
  payment, open, onOpenChange, onEdit, onDelete,
}: {
  payment: PaymentRow | null; open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void; onDelete: () => void;
}) {
  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi tiết thanh toán</DialogTitle>
          <DialogDescription>{formatDate(payment.payment_date)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
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
          <div className="space-y-3">
            <DetailRow label="Số tiền" value={<span className="font-mono tabular-nums font-medium">{formatNumber(payment.amount)} {payment.currency}</span>} />
            <DetailRow label="Nhóm/Bạn bè" value={payment.group_name ?? "Bạn bè"} />
            <DetailRow label="Phương thức" value={
              <Badge className={payment.context_type === "group"
                ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
              }>{payment.context_type === "group" ? "Nhóm" : "Bạn bè"}</Badge>
            } />
            <DetailRow label="Ngày thanh toán" value={formatDate(payment.payment_date)} />
            {payment.note && <DetailRow label="Ghi chú" value={payment.note} />}
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />Chỉnh sửa</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>Xóa thanh toán</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Expense Dialog (uses shared ExpenseForm) ─────────────
// See AdminCreateExpenseDialog component

// ─── Edit Expense Dialog (uses shared ExpenseForm) ──────────────
// See AdminEditExpenseDialog component

// ─── Create Payment Dialog ───────────────────────────────────────────

function CreatePaymentDialog({
  open, onOpenChange, onSubmit, isCreating,
}: {
  open: boolean; onOpenChange: (open: boolean) => void;
  onSubmit: (data: { from_user: string; to_user: string; amount: number; currency: string; payment_date: string; group_id: string | null; note: string }) => void;
  isCreating: boolean;
}) {
  const [fromUser, setFromUser] = useState("");
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [groupId, setGroupId] = useState<string>("none");
  const [note, setNote] = useState("");
  const [profilesList, setProfilesList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([]);
  const { tap } = useHaptics();

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabaseClient.from("profiles").select("id, full_name").order("full_name"),
      supabaseClient.from("groups").select("id, name").order("name"),
    ]).then(([profilesRes, groupsRes]) => {
      if (profilesRes.data) setProfilesList(profilesRes.data);
      if (groupsRes.data) setGroupsList(groupsRes.data);
    });
  }, [open]);

  useEffect(() => {
    if (!open) { setFromUser(""); setToUser(""); setAmount(""); setCurrency("VND"); setPaymentDate(new Date().toISOString().split("T")[0]); setGroupId("none"); setNote(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo thanh toán mới</DialogTitle>
          <DialogDescription>Thêm thanh toán thủ công vào hệ thống</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Người gửi</Label>
            <Select value={fromUser} onValueChange={(v) => { tap(); setFromUser(v); }}>
              <SelectTrigger><SelectValue placeholder="Chọn người gửi" /></SelectTrigger>
              <SelectContent>{profilesList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Người nhận</Label>
            <Select value={toUser} onValueChange={(v) => { tap(); setToUser(v); }}>
              <SelectTrigger><SelectValue placeholder="Chọn người nhận" /></SelectTrigger>
              <SelectContent>{profilesList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Số tiền</Label><Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Tiền tệ</Label>
              <Select value={currency} onValueChange={(v) => { tap(); setCurrency(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="VND">VND</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Ngày thanh toán</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Nhóm (tùy chọn)</Label>
            <Select value={groupId} onValueChange={(v) => { tap(); setGroupId(v); }}>
              <SelectTrigger><SelectValue placeholder="Không có nhóm" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không có nhóm (Bạn bè)</SelectItem>
                {groupsList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Ghi chú (tùy chọn)</Label><Input placeholder="Ghi chú..." value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { tap(); onOpenChange(false); }} disabled={isCreating}>Hủy</Button>
          <Button onClick={() => {
            if (!fromUser || !toUser || !amount || !paymentDate) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
            if (fromUser === toUser) { toast.error("Người gửi và người nhận không thể giống nhau"); return; }
            tap();
            onSubmit({ from_user: fromUser, to_user: toUser, amount: Number(amount), currency, payment_date: paymentDate, group_id: groupId === "none" ? null : groupId, note });
          }} disabled={isCreating || !fromUser || !toUser || !amount}>
            {isCreating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tạo thanh toán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Payment Dialog ────────────────────────────────────────────

function EditPaymentDialog({
  payment, open, onOpenChange, onSubmit, isUpdating,
}: {
  payment: PaymentRow | null; open: boolean; onOpenChange: (open: boolean) => void;
  onSubmit: (data: { amount: number; payment_date: string; note: string }) => void;
  isUpdating: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [note, setNote] = useState("");
  const { tap } = useHaptics();

  useEffect(() => {
    if (payment && open) { setAmount(String(payment.amount)); setPaymentDate(payment.payment_date?.split("T")[0] ?? ""); setNote(payment.note ?? ""); }
  }, [payment, open]);

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thanh toán</DialogTitle>
          <DialogDescription>Cập nhật thông tin thanh toán từ {payment.from_user_name} đến {payment.to_user_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2"><Label>Số tiền</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-2"><Label>Ngày thanh toán</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Ghi chú</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú..." /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { tap(); onOpenChange(false); }} disabled={isUpdating}>Hủy</Button>
          <Button onClick={() => { tap(); onSubmit({ amount: Number(amount), payment_date: paymentDate, note }); }} disabled={isUpdating || !amount}>
            {isUpdating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── EXPENSES TAB ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function ExpensesTab() {
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { tap, warning } = useHaptics();

  const { query: groupsQuery } = useList({ resource: "groups", pagination: { pageSize: 200 }, meta: { select: "id, name" } });
  const groups = groupsQuery.data?.data ?? [];

  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    f.push({ field: "is_payment", operator: "eq", value: false });
    if (debouncedSearch) f.push({ field: "description", operator: "contains", value: debouncedSearch });
    if (groupFilter !== "all") f.push({ field: "group_id", operator: "eq", value: groupFilter });
    if (dateFrom) f.push({ field: "expense_date", operator: "gte", value: dateFrom });
    if (dateTo) f.push({ field: "expense_date", operator: "lte", value: dateTo });
    if (amountMin) f.push({ field: "amount", operator: "gte", value: Number(amountMin) });
    if (amountMax) f.push({ field: "amount", operator: "lte", value: Number(amountMax) });
    return f;
  }, [debouncedSearch, groupFilter, dateFrom, dateTo, amountMin, amountMax]);

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(() => [
    { id: "description", header: "Mô tả", accessorKey: "description", size: 200 },
    {
      id: "category", header: "Danh mục", accessorKey: "category", size: 120, enableSorting: false,
      cell: ({ row }) => {
        const cat = getCategoryMeta(row.original.category);
        const CatIcon = cat.icon;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center justify-center h-5 w-5 rounded ${cat.bgColor}`}>
              <CatIcon size={12} className={cat.color} />
            </span>
            <span className="text-sm">{cat.name}</span>
          </div>
        );
      },
    },
    {
      id: "amount", header: () => <div className="text-right">Số tiền</div>, accessorKey: "amount", size: 140,
      cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatNumber(row.original.amount)}</div>,
    },
    {
      id: "paid_by", header: "Người trả", accessorKey: "paid_by_name", size: 180, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.paid_by_avatar ?? undefined} alt={row.original.paid_by_name} />
            <AvatarFallback className="text-xs">{row.original.paid_by_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.paid_by_name}</span>
        </div>
      ),
    },
    {
      id: "group", header: "Nhóm/Bạn bè", accessorKey: "group_name", size: 140, enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.group_name ?? "Bạn bè"}</span>,
    },
    { id: "expense_date", header: "Ngày", accessorKey: "expense_date", size: 110, cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: "status", header: "Trạng thái", accessorKey: "is_settled", size: 130, enableSorting: false,
      cell: ({ row }) => row.original.is_settled
        ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">Đã thanh toán</Badge>
        : <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">Chờ xử lý</Badge>,
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedExpense(row.original); setDetailOpen(true); }}>Xem chi tiết</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditExpenseId(row.original.id); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />Chỉnh sửa</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteExpense(row.original); setDeleteDialogOpen(true); }} className="text-destructive">Xóa chi phí</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [tap, warning]);

  const table = useTable<ExpenseRow>({
    columns,
    refineCoreProps: {
      resource: "expenses",
      meta: { select: "*, profiles!expenses_paid_by_user_id_fkey(full_name, avatar_url), groups(name), expense_splits(is_settled)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters as any },
      sorters: { initial: [{ field: "expense_date", order: "desc" }] },
      queryOptions: {
        select: (data) => {
          const transformed = data.data.map((expense: any) => {
            const splits = expense.expense_splits ?? [];
            const allSettled = splits.length > 0 && splits.every((s: any) => s.is_settled);
            return {
              id: expense.id, description: expense.description ?? "", amount: expense.amount ?? 0,
              currency: expense.currency ?? "VND", category: expense.category ?? null,
              expense_date: expense.expense_date,
              context_type: expense.context_type, group_id: expense.group_id,
              group_name: expense.groups?.name ?? null, paid_by_user_id: expense.paid_by_user_id,
              paid_by_name: expense.profiles?.full_name ?? "Không rõ",
              paid_by_avatar: expense.profiles?.avatar_url ?? null,
              is_settled: allSettled, created_at: expense.created_at,
            };
          });
          const filtered = statusFilter === "all" ? transformed : statusFilter === "settled" ? transformed.filter((e: ExpenseRow) => e.is_settled) : transformed.filter((e: ExpenseRow) => !e.is_settled);
          return { ...data, data: filtered, total: statusFilter === "all" ? data.total : filtered.length };
        },
      },
    },
  });

  const handleDelete = useCallback(async () => {
    if (!deleteExpense) return;
    warning();
    setIsDeleting(true);
    try {
      const { error } = await supabaseClient.rpc("soft_delete_expense", { p_expense_id: deleteExpense.id });
      if (error) throw error;
      toast.success(`Đã xóa chi phí "${deleteExpense.description}"`);
      setDeleteDialogOpen(false); setDeleteExpense(null); table.refineCore.tableQuery.refetch();
    } catch (err: any) { toast.error(`Lỗi: ${err.message ?? "Không thể xóa chi phí"}`); }
    finally { setIsDeleting(false); }
  }, [deleteExpense, table.refineCore.tableQuery, warning]);

  const handleRefetch = useCallback(() => {
    tap();
    table.refineCore.tableQuery.refetch();
  }, [table.refineCore.tableQuery, tap]);

  const clearFilters = useCallback(() => { tap(); setSearch(""); setGroupFilter("all"); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); }, [tap]);
  const hasActiveFilters = search !== "" || groupFilter !== "all" || statusFilter !== "all" || dateFrom !== "" || dateTo !== "" || amountMin !== "" || amountMax !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div><CardTitle>Quản lý chi phí</CardTitle><CardDescription>Xem và quản lý tất cả chi phí trong hệ thống</CardDescription></div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}><PlusIcon className="mr-2 h-4 w-4" />Tạo chi phí</Button>
            <Button variant="outline" size="sm" onClick={() => { tap(); setShowFilters((v) => !v); }}><FilterIcon className="mr-2 h-4 w-4" />Bộ lọc</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm kiếm theo mô tả..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Từ ngày</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Đến ngày</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Nhóm</label>
                  <Select value={groupFilter} onValueChange={(v) => { tap(); setGroupFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Tất cả nhóm" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả nhóm</SelectItem>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Trạng thái</label>
                  <Select value={statusFilter} onValueChange={(v) => { tap(); setStatusFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="settled">Đã thanh toán</SelectItem><SelectItem value="pending">Chờ xử lý</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Số tiền từ</label><Input type="number" placeholder="0" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="w-[120px]" /></div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Số tiền đến</label><Input type="number" placeholder="∞" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="w-[120px]" /></div>
                {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>}
              </div>
            </CollapsibleContent>
          </Collapsible>
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]"><EmptyMedia variant="icon"><ReceiptIcon className="h-6 w-6" /></EmptyMedia><EmptyHeader><EmptyTitle>Không tìm thấy chi phí</EmptyTitle><EmptyDescription>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button></EmptyContent></Empty>
          ) : (
            <DataTable table={table} />
          )}
        </CardContent>
      </Card>

      <ExpenseDetailDialog expense={selectedExpense} open={detailOpen} onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); setEditExpenseId(selectedExpense?.id ?? null); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeleteExpense(selectedExpense); setDeleteDialogOpen(true); }}
      />
      <DeleteConfirmDialog title="Xác nhận xóa chi phí" description={`Bạn có chắc chắn muốn xóa chi phí "${deleteExpense?.description ?? ""}" (${formatNumber(deleteExpense?.amount ?? 0)})? Chi phí sẽ được soft-delete.`}
        open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteExpense(null); } }} onConfirm={handleDelete} isDeleting={isDeleting}
      />
      <AdminCreateExpenseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={handleRefetch} />
      <AdminEditExpenseDialog expenseId={editExpenseId} open={editDialogOpen} onOpenChange={(o) => { if (!o) { setEditDialogOpen(false); setEditExpenseId(null); } }} onSuccess={handleRefetch} />
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ─── PAYMENTS TAB ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function PaymentsTab() {
  const deleteMutation = useDelete();
  const createMutation = useCreate();
  const updateMutation = useUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [senderFilter, setSenderFilter] = useState<string>("all");
  const [receiverFilter, setReceiverFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deletePayment, setDeletePayment] = useState<PaymentRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { tap, success, warning } = useHaptics();

  const { query: groupsQuery } = useList({ resource: "groups", pagination: { pageSize: 200 }, meta: { select: "id, name" } });
  const groups = groupsQuery.data?.data ?? [];

  const { query: profilesQuery } = useList({ resource: "profiles", pagination: { pageSize: 200 }, meta: { select: "id, full_name" } });
  const profiles = profilesQuery.data?.data ?? [];

  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (debouncedSearch) f.push({ field: "note", operator: "contains", value: debouncedSearch });
    if (groupFilter !== "all") f.push({ field: "group_id", operator: "eq", value: groupFilter });
    if (senderFilter !== "all") f.push({ field: "from_user", operator: "eq", value: senderFilter });
    if (receiverFilter !== "all") f.push({ field: "to_user", operator: "eq", value: receiverFilter });
    if (dateFrom) f.push({ field: "payment_date", operator: "gte", value: dateFrom });
    if (dateTo) f.push({ field: "payment_date", operator: "lte", value: dateTo });
    return f;
  }, [debouncedSearch, groupFilter, senderFilter, receiverFilter, dateFrom, dateTo]);

  const columns = useMemo<ColumnDef<PaymentRow>[]>(() => [
    {
      id: "from_user", header: "Người gửi", accessorKey: "from_user_name", size: 180, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.from_user_avatar ?? undefined} alt={row.original.from_user_name} />
            <AvatarFallback className="text-xs">{row.original.from_user_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.from_user_name}</span>
        </div>
      ),
    },
    {
      id: "to_user", header: "Người nhận", accessorKey: "to_user_name", size: 180, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.to_user_avatar ?? undefined} alt={row.original.to_user_name} />
            <AvatarFallback className="text-xs">{row.original.to_user_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.to_user_name}</span>
        </div>
      ),
    },
    {
      id: "amount", header: () => <div className="text-right">Số tiền</div>, accessorKey: "amount", size: 140,
      cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatNumber(row.original.amount)}</div>,
    },
    {
      id: "group", header: "Nhóm/Bạn bè", accessorKey: "group_name", size: 140, enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.group_name ?? "Bạn bè"}</span>,
    },
    {
      id: "payment_date", header: "Ngày", accessorKey: "payment_date", size: 110,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "context_type", header: "Phương thức", accessorKey: "context_type", size: 120, enableSorting: false,
      cell: ({ row }) => (
        <Badge className={
          row.original.context_type === "group"
            ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800"
            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
        }>{row.original.context_type === "group" ? "Nhóm" : "Bạn bè"}</Badge>
      ),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedPayment(row.original); setDetailOpen(true); }}>Xem chi tiết</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditPayment(row.original); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />Chỉnh sửa</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeletePayment(row.original); setDeleteDialogOpen(true); }} className="text-destructive">Xóa thanh toán</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [tap, warning]);

  const table = useTable<PaymentRow>({
    columns,
    refineCoreProps: {
      resource: "payments",
      meta: { select: "*, from:profiles!payments_from_user_fkey(full_name, avatar_url), to:profiles!payments_to_user_fkey(full_name, avatar_url), groups(name)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters as any },
      sorters: { initial: [{ field: "payment_date", order: "desc" }] },
      syncWithLocation: false,
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

  const handleDelete = useCallback(() => {
    if (!deletePayment) return;
    warning();
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "payments", id: deletePayment.id },
      {
        onSuccess: () => { toast.success(`Đã xóa thanh toán ${formatNumber(deletePayment.amount)} ${deletePayment.currency}`); setDeleteDialogOpen(false); setDeletePayment(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(`Lỗi: ${error.message}`); setIsDeleting(false); },
      },
    );
  }, [deletePayment, deleteMutation, table.refineCore.tableQuery, warning]);

  const handleCreate = useCallback((data: { from_user: string; to_user: string; amount: number; currency: string; payment_date: string; group_id: string | null; note: string }) => {
    setIsCreating(true);
    createMutation.mutate(
      { resource: "payments", values: { from_user: data.from_user, to_user: data.to_user, amount: data.amount, currency: data.currency, payment_date: data.payment_date, group_id: data.group_id, context_type: data.group_id ? "group" : "friend", note: data.note || null } },
      {
        onSuccess: () => { success(); toast.success("Đã tạo thanh toán mới"); setCreateDialogOpen(false); setIsCreating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(`Lỗi: ${error.message}`); setIsCreating(false); },
      },
    );
  }, [createMutation, table.refineCore.tableQuery, success]);

  const handleEdit = useCallback((data: { amount: number; payment_date: string; note: string }) => {
    if (!editPayment) return;
    setIsUpdating(true);
    updateMutation.mutate(
      { resource: "payments", id: editPayment.id, values: { amount: data.amount, payment_date: data.payment_date, note: data.note || null } },
      {
        onSuccess: () => { success(); toast.success("Đã cập nhật thanh toán"); setEditDialogOpen(false); setEditPayment(null); setIsUpdating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(`Lỗi: ${error.message}`); setIsUpdating(false); },
      },
    );
  }, [editPayment, updateMutation, table.refineCore.tableQuery, success]);

  const clearFilters = useCallback(() => { tap(); setSearch(""); setGroupFilter("all"); setSenderFilter("all"); setReceiverFilter("all"); setDateFrom(""); setDateTo(""); }, [tap]);
  const hasActiveFilters = search !== "" || groupFilter !== "all" || senderFilter !== "all" || receiverFilter !== "all" || dateFrom !== "" || dateTo !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div><CardTitle>Quản lý thanh toán</CardTitle><CardDescription>Xem và quản lý tất cả thanh toán trong hệ thống</CardDescription></div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}><PlusIcon className="mr-2 h-4 w-4" />Tạo thanh toán</Button>
            <Button variant="outline" size="sm" onClick={() => { tap(); setShowFilters((v) => !v); }}><FilterIcon className="mr-2 h-4 w-4" />Bộ lọc</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm kiếm theo ghi chú..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Từ ngày</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Đến ngày</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Nhóm</label>
                  <Select value={groupFilter} onValueChange={(v) => { tap(); setGroupFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Tất cả nhóm" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả nhóm</SelectItem>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Người gửi</label>
                  <Select value={senderFilter} onValueChange={(v) => { tap(); setSenderFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả</SelectItem>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Người nhận</label>
                  <Select value={receiverFilter} onValueChange={(v) => { tap(); setReceiverFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả</SelectItem>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>}
              </div>
            </CollapsibleContent>
          </Collapsible>
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]"><EmptyMedia variant="icon"><CreditCardIcon className="h-6 w-6" /></EmptyMedia><EmptyHeader><EmptyTitle>Không tìm thấy thanh toán</EmptyTitle><EmptyDescription>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button></EmptyContent></Empty>
          ) : (
            <DataTable table={table} />
          )}
        </CardContent>
      </Card>

      <PaymentDetailDialog payment={selectedPayment} open={detailOpen} onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); setEditPayment(selectedPayment); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeletePayment(selectedPayment); setDeleteDialogOpen(true); }}
      />
      <DeleteConfirmDialog title="Xác nhận xóa thanh toán" description={`Bạn có chắc chắn muốn xóa thanh toán ${formatNumber(deletePayment?.amount ?? 0)} ${deletePayment?.currency ?? "VND"} từ "${deletePayment?.from_user_name ?? ""}" đến "${deletePayment?.to_user_name ?? ""}"?`}
        open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeletePayment(null); } }} onConfirm={handleDelete} isDeleting={isDeleting}
      />
      <CreatePaymentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={handleCreate} isCreating={isCreating} />
      <EditPaymentDialog payment={editPayment} open={editDialogOpen} onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditPayment(null); } }} onSubmit={handleEdit} isUpdating={isUpdating} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN EXPORT ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export function AdminTransactions() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList>
          <TabsTrigger value="expenses" className="gap-2">
            <ReceiptIcon className="h-4 w-4" />
            Chi phí
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCardIcon className="h-4 w-4" />
            Thanh toán
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
