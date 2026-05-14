import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useGetIdentity, useList, type CrudFilters } from "@refinedev/core";
import { useInstantCreate, useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  ReceiptIcon,
  CreditCardIcon,
  BellIcon,
  MoreHorizontalIcon,
  AlertTriangleIcon,
  Loader2Icon,
  PlusIcon,
  PencilIcon,
  CheckCircle2Icon,
  ClockIcon,
  ChevronsUpDownIcon,
  CheckIcon,
} from "@/components/ui/icons";
import { AdminNotifications } from "@/modules/admin/sub-pages/AdminNotifications";
import { AdminPageToolbar } from "@/modules/admin/components/AdminPageToolbar";
import { AdminFilterChips } from "@/modules/admin/components/AdminFilterChips";
import { useAdminTranslation } from "../i18n";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { MarkdownComment } from "@/modules/expenses/components/markdown-comment";
import { AttachmentList } from "@/modules/expenses/components/attachment-list";
import { Attachment } from "@/modules/expenses/types";
import type { Profile } from "@/modules/profile/types";
import { AdminCreateExpenseDialog } from "../components/AdminCreateExpenseDialog";
import { AdminEditExpenseDialog } from "../components/AdminEditExpenseDialog";
import { AdminCrudDialog } from "../components/AdminCrudSheet";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "../components/AdminMobileCards";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import {
  applySplitSettlementChangeTyped,
  getExpenseSettlementStatus,
} from "./admin-transactions.utils";
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
  friendship_id: string | null;
  friendship_name: string | null;
  payment_date: string;
  note: string | null;
  created_at: string;
}

interface FriendshipOption {
  id: string;
  user_a: string;
  user_b: string;
  user_a_name: string;
  user_b_name: string;
}

interface PaymentFormPayload {
  context_type: "group" | "friend";
  group_id: string | null;
  friendship_id: string | null;
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  payment_date: string;
  note: string;
}

type GroupOption = { id: string; name: string };
type ProfileOption = { id: string; full_name: string };

type FriendshipOptionRecord = {
  id: string;
  user_a: string;
  user_b: string;
  user_a_profile?: RelationOne<{ full_name: string | null }>;
  user_b_profile?: RelationOne<{ full_name: string | null }>;
};

type ExpenseRecord = {
  id: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  category: string | null;
  expense_date: string;
  context_type: string;
  group_id: string | null;
  paid_by_user_id: string;
  created_at: string;
  groups?: { name: string | null } | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  expense_splits?: Array<{ is_settled: boolean | null }> | null;
};

type PaymentRecord = {
  id: string;
  from_user: string;
  to_user: string;
  amount: number | null;
  currency: string | null;
  context_type: string;
  group_id: string | null;
  friendship_id: string | null;
  payment_date: string;
  note: string | null;
  created_at: string;
  from?: { full_name: string | null; avatar_url: string | null } | null;
  to?: { full_name: string | null; avatar_url: string | null } | null;
  groups?: { name: string | null } | null;
  friendships?: RelationOne<FriendshipOptionRecord>;
};

type RelationOne<T> = T | T[] | null | undefined;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function relationOne<T>(value: RelationOne<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
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
  const { tAdmin } = useAdminTranslation();

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
          <AlertDialogCancel disabled={isDeleting}>{tAdmin("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); onConfirm(); }} disabled={isDeleting}>
            {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("common.delete")}
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

function formatFriendshipName(friendship: FriendshipOption): string {
  return `${friendship.user_a_name} - ${friendship.user_b_name}`;
}

// ─── Expense Detail Dialog ──────────────────────────────────────────

function ExpenseDetailDialog({
  expense, open, onOpenChange, onEdit, onDelete, onSettlementChange,
}: {
  expense: ExpenseRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSettlementChange: (expenseId: string, nextIsSettled: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(false);
  const [updatingSplitId, setUpdatingSplitId] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const expenseId = expense?.id;
  const resolvedIsSettled = getExpenseSettlementStatus(splits, expense?.is_settled ?? false);

  const handleToggleSplitSettlement = useCallback(async (split: ExpenseSplit) => {
    if (!expense) return;

    setUpdatingSplitId(split.id);
    try {
      const { error } = split.is_settled
        ? await supabaseClient.rpc("unsettle_split", { p_split_id: split.id })
        : await supabaseClient.rpc("settle_split", {
            p_split_id: split.id,
            p_amount: split.computed_amount,
          });

      if (error) throw error;

      const nextSplits = applySplitSettlementChangeTyped(splits, split.id, !split.is_settled);
      setSplits(nextSplits);

      const nextStatus = getExpenseSettlementStatus(nextSplits, expense.is_settled);
      onSettlementChange(expense.id, nextStatus);

      toast.success(
        split.is_settled
          ? tAdmin("transactions.expenses.splitMarkedUnpaid", { name: split.user_name })
          : tAdmin("transactions.expenses.splitMarkedPaid", { name: split.user_name }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tAdmin("transactions.expenses.splitSettlementError");
      toast.error(tAdmin("common.errorWithMessage", { message }));
    } finally {
      setUpdatingSplitId(null);
    }
  }, [expense, onSettlementChange, splits, tAdmin]);

  useEffect(() => {
    if (!expenseId || !open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSplits(true);
    type ExpenseSplitResponse = {
      id: string;
      user_id: string;
      split_method: string;
      computed_amount: number;
      is_settled: boolean | null;
      settled_amount: number | null;
      profiles?: {
        full_name: string | null;
      } | null;
    };

    // Fetch splits, comment, and attachments in parallel
    Promise.all([
      supabaseClient
        .from("expense_splits")
        .select("*, profiles!expense_splits_user_id_fkey(full_name)")
        .eq("expense_id", expenseId),
      supabaseClient
        .from("expenses")
        .select("comment")
        .eq("id", expenseId)
        .single(),
      supabaseClient
        .from("attachments")
        .select("*")
        .eq("expense_id", expenseId),
    ]).then(([splitsRes, commentRes, attachmentsRes]) => {
      if (!splitsRes.error && splitsRes.data) {
        setSplits((splitsRes.data as ExpenseSplitResponse[]).map((s) => ({
          id: s.id, user_id: s.user_id, user_name: s.profiles?.full_name ?? tAdmin("common.unknown"),
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
  }, [expenseId, open, tAdmin]);

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{expense.description}</DialogTitle>
          <DialogDescription>{tAdmin("transactions.expenses.detailDescription", { date: formatDate(expense.expense_date) })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label={tAdmin("common.amount")} value={`${formatNumber(expense.amount)} ${expense.currency}`} />
            <DetailItem label={tAdmin("transactions.expenses.payer")} value={expense.paid_by_name} />
            <DetailItem label={tAdmin("common.group")} value={expense.group_name ?? tAdmin("context.friends")} />
            <DetailItem label={tAdmin("transactions.expenses.context")} value={expense.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")} />
            <DetailItem label={tAdmin("transactions.expenses.category")} value={
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
            <DetailItem label={tAdmin("common.status")} value={
              resolvedIsSettled
                ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.settled")}</Badge>
                : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.pending")}</Badge>
            } />
            <DetailItem label={tAdmin("common.createdAt")} value={formatDate(expense.created_at)} />
            <DetailItem label="ID" value={<span className="font-mono text-xs">{expense.id}</span>} />
          </div>

          {/* Comment section - parity with Client show page */}
          {comment && comment.trim() !== "" && (
            <div>
              <h4 className="text-sm font-medium mb-2">{tAdmin("transactions.expenses.comment")}</h4>
              <div className="rounded-md border p-3 bg-muted/30">
                <MarkdownComment content={comment} className="text-sm" />
              </div>
            </div>
          )}

          {/* Splits section */}
          <div>
            <h4 className="text-sm font-medium mb-2">{tAdmin("transactions.expenses.splits")}</h4>
            {loadingSplits ? (
              <div className="flex items-center justify-center py-6"><Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : splits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{tAdmin("transactions.expenses.noSplits")}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tAdmin("common.user")}</TableHead>
                      <TableHead>{tAdmin("transactions.expenses.splitMethod")}</TableHead>
                      <TableHead className="text-right">{tAdmin("common.amount")}</TableHead>
                      <TableHead>{tAdmin("common.status")}</TableHead>
                      <TableHead className="text-right">{tAdmin("transactions.expenses.splitUpdate")}</TableHead>
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
                            ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.splitPaid")}</Badge>
                            : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.splitUnpaid")}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={split.is_settled ? "outline" : "default"}
                            onClick={() => void handleToggleSplitSettlement(split)}
                            disabled={updatingSplitId === split.id}
                          >
                            {updatingSplitId === split.id ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {split.is_settled ? tAdmin("transactions.expenses.markUnpaid") : tAdmin("transactions.expenses.markPaid")}
                          </Button>
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
              <h4 className="text-sm font-medium mb-2">{tAdmin("transactions.expenses.attachments")} ({attachments.length})</h4>
              <AttachmentList attachments={attachments} canDelete={false} />
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>{tAdmin("common.delete")}</Button>
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
  const { tAdmin } = useAdminTranslation();

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tAdmin("transactions.payments.detailTitle")}</DialogTitle>
          <DialogDescription>{formatDate(payment.payment_date)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <UserAvatar
              user={{
                full_name: payment.from_user_name,
                avatar_url: payment.from_user_avatar,
              }}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">{tAdmin("transactions.payments.fromUser")}</span>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-medium truncate">{payment.from_user_name}</p>
                <UserGroupStack userId={payment.from_user_id} size="xs" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <UserAvatar
              user={{
                full_name: payment.to_user_name,
                avatar_url: payment.to_user_avatar,
              }}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">{tAdmin("transactions.payments.toUser")}</span>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-medium truncate">{payment.to_user_name}</p>
                <UserGroupStack userId={payment.to_user_id} size="xs" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <DetailRow label={tAdmin("common.amount")} value={<span className="font-mono tabular-nums font-medium">{formatNumber(payment.amount)} {payment.currency}</span>} />
            <DetailRow label={tAdmin("transactions.expenses.context")} value={payment.group_name ?? payment.friendship_name ?? tAdmin("context.friends")} />
            <DetailRow label={tAdmin("transactions.payments.method")} value={
              <Badge className={payment.context_type === "group"
                ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]"
                : "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]"
              }>{payment.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")}</Badge>
            } />
            <DetailRow label={tAdmin("transactions.payments.paymentDate")} value={formatDate(payment.payment_date)} />
            <DetailRow label={tAdmin("transactions.payments.currency")} value={payment.currency} />
            <DetailRow label={tAdmin("common.createdAt")} value={formatDate(payment.created_at)} />
            <DetailRow label="ID" value={<span className="font-mono text-xs">{payment.id}</span>} />
            {payment.note && <DetailRow label={tAdmin("transactions.payments.note")} value={payment.note} />}
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>{tAdmin("common.delete")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Expense Dialog (uses shared ExpenseForm) ─────────────
// See AdminCreateExpenseDialog component

// ─── Edit Expense Dialog (uses shared ExpenseForm) ──────────────
// See AdminEditExpenseDialog component

// ─── User Single Combobox ────────────────────────────────────────────

function UserSingleCombobox({
  value,
  onChange,
  users,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  users: Array<{ id: string; full_name: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected
            ? <span className="truncate">{selected.full_name}</span>
            : <span className="text-muted-foreground truncate">{placeholder}</span>}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={tAdmin("transactions.payments.searchUsers")} />
          <CommandList>
            <CommandEmpty>{tAdmin("transactions.payments.noUsersFound")}</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.full_name}
                  onSelect={() => { onChange(user.id); setOpen(false); }}
                  className="cursor-pointer"
                >
                  <CheckIcon className={cn("mr-2 h-4 w-4 shrink-0", value === user.id ? "opacity-100" : "opacity-0")} />
                  {user.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Create Payment Dialog ───────────────────────────────────────────

function CreatePaymentDialog({
  open, onOpenChange, onSubmit, isCreating,
}: {
  open: boolean; onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormPayload) => void;
  isCreating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [contextType, setContextType] = useState<"group" | "friend">("group");
  const [fromUser, setFromUser] = useState("");
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [groupId, setGroupId] = useState<string>("");
  const [friendshipId, setFriendshipId] = useState<string>("");
  const [note, setNote] = useState("");
  const [profilesList, setProfilesList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([]);
  const [friendshipsList, setFriendshipsList] = useState<FriendshipOption[]>([]);
  const { tap } = useHaptics();

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabaseClient.from("profiles").select("id, full_name").order("full_name"),
      supabaseClient.from("groups").select("id, name").order("name"),
      supabaseClient
        .from("friendships")
        .select("id, user_a, user_b, user_a_profile:profiles!user_a(full_name), user_b_profile:profiles!user_b(full_name)")
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]).then(([profilesRes, groupsRes, friendshipsRes]) => {
      if (profilesRes.data) setProfilesList(profilesRes.data);
      if (groupsRes.data) setGroupsList(groupsRes.data);
      if (friendshipsRes.data) {
        const friendshipRows = friendshipsRes.data as unknown as FriendshipOptionRecord[];
        setFriendshipsList(friendshipRows.map((friendship) => ({
          id: friendship.id,
          user_a: friendship.user_a,
          user_b: friendship.user_b,
          user_a_name: relationOne(friendship.user_a_profile)?.full_name ?? tAdmin("people.userA"),
          user_b_name: relationOne(friendship.user_b_profile)?.full_name ?? tAdmin("people.userB"),
        })));
      }
    });
  }, [open, tAdmin]);

  const handleSubmit = () => {
    const missingContext = contextType === "group" ? !groupId : !friendshipId;
    if (!fromUser || !toUser || !amount || !paymentDate || missingContext) {
      toast.error(tAdmin("transactions.payments.requiredFields"));
      return;
    }
    if (fromUser === toUser) {
      toast.error(tAdmin("transactions.payments.sameUserError"));
      return;
    }
    tap();
    onSubmit({
      context_type: contextType,
      from_user: fromUser,
      to_user: toUser,
      amount: Number(amount),
      currency,
      payment_date: paymentDate,
      group_id: contextType === "group" ? groupId : null,
      friendship_id: contextType === "friend" ? friendshipId : null,
      note,
    });
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("transactions.payments.createTitle")}
      description={tAdmin("transactions.payments.createDescription")}
      isSubmitting={isCreating}
      submitLabel={tAdmin("transactions.payments.create")}
      onSubmit={handleSubmit}
      contentClassName="sm:max-w-[640px]"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
          <button
            type="button"
            onClick={() => { tap(); setContextType("group"); setFriendshipId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "group" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.group")}
          </button>
          <button
            type="button"
            onClick={() => { tap(); setContextType("friend"); setGroupId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "friend" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.friends")}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{contextType === "group" ? tAdmin("common.group") : tAdmin("common.friendship")}</Label>
            {contextType === "group" ? (
              <Select value={groupId} onValueChange={(v) => { tap(); setGroupId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("transactions.expenses.allGroups")} /></SelectTrigger>
                <SelectContent>
                  {groupsList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={friendshipId} onValueChange={(v) => { tap(); setFriendshipId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("people.selectUser")} /></SelectTrigger>
                <SelectContent>
                  {friendshipsList.map((friendship) => (
                    <SelectItem key={friendship.id} value={friendship.id}>
                      {formatFriendshipName(friendship)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.paymentDate")}</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.fromUser")}</Label>
            <UserSingleCombobox
              value={fromUser}
              onChange={(v) => { tap(); setFromUser(v); }}
              users={profilesList}
              placeholder={tAdmin("transactions.payments.selectSender")}
            />
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.toUser")}</Label>
            <UserSingleCombobox
              value={toUser}
              onChange={(v) => { tap(); setToUser(v); }}
              users={profilesList}
              placeholder={tAdmin("transactions.payments.selectReceiver")}
            />
          </div>
          <div className="space-y-2"><Label>{tAdmin("common.amount")}</Label><Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.currency")}</Label>
            <Select value={currency} onValueChange={(v) => { tap(); setCurrency(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="VND">VND</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label>{tAdmin("transactions.payments.noteOptional")}</Label><Input placeholder={tAdmin("transactions.payments.notePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Edit Payment Dialog ────────────────────────────────────────────

function EditPaymentDialog({
  payment, open, onOpenChange, onSubmit, isUpdating,
}: {
  payment: PaymentRow | null; open: boolean; onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormPayload) => void;
  isUpdating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const initialContextType = payment?.context_type === "friend" ? "friend" : "group";
  const [contextType, setContextType] = useState<"group" | "friend">(initialContextType);
  const [fromUser, setFromUser] = useState(payment?.from_user_id ?? "");
  const [toUser, setToUser] = useState(payment?.to_user_id ?? "");
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [currency, setCurrency] = useState(payment?.currency || "VND");
  const [paymentDate, setPaymentDate] = useState(payment?.payment_date?.split("T")[0] ?? "");
  const [groupId, setGroupId] = useState(payment?.group_id ?? "");
  const [friendshipId, setFriendshipId] = useState(payment?.friendship_id ?? "");
  const [note, setNote] = useState(payment?.note ?? "");
  const [profilesList, setProfilesList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([]);
  const [friendshipsList, setFriendshipsList] = useState<FriendshipOption[]>([]);
  const { tap } = useHaptics();

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabaseClient.from("profiles").select("id, full_name").order("full_name"),
      supabaseClient.from("groups").select("id, name").order("name"),
      supabaseClient
        .from("friendships")
        .select("id, user_a, user_b, user_a_profile:profiles!user_a(full_name), user_b_profile:profiles!user_b(full_name)")
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]).then(([profilesRes, groupsRes, friendshipsRes]) => {
      if (profilesRes.data) setProfilesList(profilesRes.data);
      if (groupsRes.data) setGroupsList(groupsRes.data);
      if (friendshipsRes.data) {
        const friendshipRows = friendshipsRes.data as unknown as FriendshipOptionRecord[];
        setFriendshipsList(friendshipRows.map((friendship) => ({
          id: friendship.id,
          user_a: friendship.user_a,
          user_b: friendship.user_b,
          user_a_name: relationOne(friendship.user_a_profile)?.full_name ?? tAdmin("people.userA"),
          user_b_name: relationOne(friendship.user_b_profile)?.full_name ?? tAdmin("people.userB"),
        })));
      }
    });
  }, [open, tAdmin]);

  if (!payment) return null;

  const handleSubmit = () => {
    const missingContext = contextType === "group" ? !groupId : !friendshipId;
    if (!fromUser || !toUser || !amount || !paymentDate || missingContext) {
      toast.error(tAdmin("transactions.payments.requiredFields"));
      return;
    }
    if (fromUser === toUser) {
      toast.error(tAdmin("transactions.payments.sameUserError"));
      return;
    }
    tap();
    onSubmit({
      context_type: contextType,
      from_user: fromUser,
      to_user: toUser,
      amount: Number(amount),
      currency,
      payment_date: paymentDate,
      group_id: contextType === "group" ? groupId : null,
      friendship_id: contextType === "friend" ? friendshipId : null,
      note,
    });
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("transactions.payments.editTitle")}
      description={tAdmin("transactions.payments.editDescriptionForUsers", {
        from: payment.from_user_name,
        to: payment.to_user_name,
      })}
      isSubmitting={isUpdating}
      submitLabel={tAdmin("common.save")}
      contentClassName="sm:max-w-[640px]"
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
          <button
            type="button"
            onClick={() => { tap(); setContextType("group"); setFriendshipId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "group" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.group")}
          </button>
          <button
            type="button"
            onClick={() => { tap(); setContextType("friend"); setGroupId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "friend" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.friends")}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{contextType === "group" ? tAdmin("common.group") : tAdmin("common.friendship")}</Label>
            {contextType === "group" ? (
              <Select value={groupId} onValueChange={(v) => { tap(); setGroupId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("transactions.expenses.allGroups")} /></SelectTrigger>
                <SelectContent>
                  {groupsList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={friendshipId} onValueChange={(v) => { tap(); setFriendshipId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("common.friendship")} /></SelectTrigger>
                <SelectContent>
                  {friendshipsList.map((friendship) => (
                    <SelectItem key={friendship.id} value={friendship.id}>
                      {formatFriendshipName(friendship)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2"><Label>{tAdmin("transactions.payments.paymentDate")}</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.fromUser")}</Label>
            <UserSingleCombobox value={fromUser} onChange={(v) => { tap(); setFromUser(v); }} users={profilesList} placeholder={tAdmin("transactions.payments.selectSender")} />
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.toUser")}</Label>
            <UserSingleCombobox value={toUser} onChange={(v) => { tap(); setToUser(v); }} users={profilesList} placeholder={tAdmin("transactions.payments.selectReceiver")} />
          </div>
          <div className="space-y-2"><Label>{tAdmin("common.amount")}</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.currency")}</Label>
            <Select value={currency} onValueChange={(v) => { tap(); setCurrency(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="VND">VND</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label>{tAdmin("transactions.payments.note")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tAdmin("transactions.payments.notePlaceholder")} /></div>
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <DetailItem label="ID" value={<span className="font-mono text-xs">{payment.id}</span>} />
          <DetailItem label={tAdmin("common.createdAt")} value={formatDate(payment.created_at)} />
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── EXPENSES TAB ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function ExpensesTab() {
  const { tAdmin } = useAdminTranslation();
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
  const groups = (groupsQuery.data?.data ?? []) as GroupOption[];

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
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
    { id: "description", header: tAdmin("transactions.expenses.description"), accessorKey: "description", size: 200 },
    {
      id: "category", header: tAdmin("transactions.expenses.category"), accessorKey: "category", size: 120, enableSorting: false,
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
      id: "amount", header: () => <div className="text-right">{tAdmin("common.amount")}</div>, accessorKey: "amount", size: 140,
      cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatNumber(row.original.amount)}</div>,
    },
    {
      id: "paid_by", header: tAdmin("transactions.expenses.payer"), accessorKey: "paid_by_name", size: 220, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            user={{
              full_name: row.original.paid_by_name,
              avatar_url: row.original.paid_by_avatar,
            }}
            size="sm"
          />
          <span className="text-sm truncate">{row.original.paid_by_name}</span>
          <UserGroupStack userId={row.original.paid_by_user_id} size="xs" />
        </div>
      ),
    },
    {
      id: "group", header: tAdmin("transactions.expenses.context"), accessorKey: "group_name", size: 140, enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.group_name ?? tAdmin("context.friends")}</span>,
    },
    { id: "expense_date", header: tAdmin("transactions.expenses.date"), accessorKey: "expense_date", size: 110, cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: "status", header: tAdmin("common.status"), accessorKey: "is_settled", size: 130, enableSorting: false,
      cell: ({ row }) => row.original.is_settled
        ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.settled")}</Badge>
        : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.pending")}</Badge>,
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedExpense(row.original); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditExpenseId(row.original.id); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteExpense(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [tap, tAdmin, warning]);

  const table = useTable<ExpenseRow>({
    columns,
    refineCoreProps: {
      resource: "expenses",
      meta: { select: "*, profiles!expenses_paid_by_user_id_fkey(full_name, avatar_url), groups(name), expense_splits(is_settled)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "expense_date", order: "desc" }] },
      syncWithLocation: false,
      queryOptions: {
        select: (data) => {
          const transformed = (data.data as ExpenseRecord[]).map((expense) => {
            const splits = expense.expense_splits ?? [];
            const allSettled = splits.length > 0 && splits.every((s) => s.is_settled);
            return {
              id: expense.id, description: expense.description ?? "", amount: expense.amount ?? 0,
              currency: expense.currency ?? "VND", category: expense.category ?? null,
              expense_date: expense.expense_date,
              context_type: expense.context_type, group_id: expense.group_id,
              group_name: expense.groups?.name ?? null, paid_by_user_id: expense.paid_by_user_id,
              paid_by_name: expense.profiles?.full_name ?? tAdmin("common.unknown"),
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
      toast.success(tAdmin("transactions.expenses.deleted", { description: deleteExpense.description }));
      setDeleteDialogOpen(false); setDeleteExpense(null); table.refineCore.tableQuery.refetch();
    } catch (err: unknown) { toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("transactions.expenses.deleteTitle")) })); }
    finally { setIsDeleting(false); }
  }, [deleteExpense, table.refineCore.tableQuery, tAdmin, warning]);

  const handleRefetch = useCallback(() => {
    tap();
    table.refineCore.tableQuery.refetch();
  }, [table.refineCore.tableQuery, tap]);

  const handleSettlementChange = useCallback((expenseId: string, nextIsSettled: boolean) => {
    setSelectedExpense((current) =>
      current && current.id === expenseId
        ? { ...current, is_settled: nextIsSettled }
        : current,
    );
    table.refineCore.tableQuery.refetch();
  }, [table.refineCore.tableQuery]);

  const clearFilters = useCallback(() => { tap(); setSearch(""); setGroupFilter("all"); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); }, [tap]);
  const hasActiveFilters = search !== "" || groupFilter !== "all" || statusFilter !== "all" || dateFrom !== "" || dateTo !== "" || amountMin !== "" || amountMax !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleExpenses = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div><CardTitle>{tAdmin("transactions.expenses.cardTitle")}</CardTitle><CardDescription>{tAdmin("transactions.expenses.cardDescription")}</CardDescription></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPageToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tAdmin("transactions.expenses.searchPlaceholder")}
            filterCount={[groupFilter !== "all", statusFilter !== "all", dateFrom !== "", dateTo !== "", amountMin !== "", amountMax !== ""].filter(Boolean).length}
            onFilterToggle={() => setShowFilters((v) => !v)}
            actions={
              <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {tAdmin("transactions.expenses.create")}
              </Button>
            }
          />
          <AdminFilterChips
            filters={[
              ...(groupFilter !== "all" ? [{ key: "group", label: tAdmin("transactions.filterChips.group", { value: groups.find((g) => g.id === groupFilter)?.name ?? groupFilter }), onRemove: () => { tap(); setGroupFilter("all"); } }] : []),
              ...(statusFilter !== "all" ? [{ key: "status", label: tAdmin("transactions.filterChips.status", { value: statusFilter === "settled" ? tAdmin("transactions.expenses.settled") : tAdmin("transactions.expenses.pending") }), onRemove: () => { tap(); setStatusFilter("all"); } }] : []),
              ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => setDateFrom("") }] : []),
              ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => setDateTo("") }] : []),
              ...(amountMin !== "" ? [{ key: "amountMin", label: tAdmin("transactions.filterChips.amountMin", { value: amountMin }), onRemove: () => setAmountMin("") }] : []),
              ...(amountMax !== "" ? [{ key: "amountMax", label: tAdmin("transactions.filterChips.amountMax", { value: amountMax }), onRemove: () => setAmountMax("") }] : []),
            ]}
            onClearAll={clearFilters}
          />
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.group")}</Label>
                  <Select value={groupFilter} onValueChange={(v) => { tap(); setGroupFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("transactions.expenses.allGroups")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("transactions.expenses.allGroups")}</SelectItem>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">{tAdmin("common.status")}</Label>
                    <span className="text-[10px] text-muted-foreground/60">({tAdmin("transactions.expenses.localPageFilterHint")})</span>
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { tap(); setStatusFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("common.all")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("common.all")}</SelectItem><SelectItem value="settled">{tAdmin("transactions.expenses.settled")}</SelectItem><SelectItem value="pending">{tAdmin("transactions.expenses.pending")}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("transactions.expenses.amountFrom")}</Label><Input type="number" placeholder="0" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="w-[120px]" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("transactions.expenses.amountTo")}</Label><Input type="number" placeholder="∞" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="w-[120px]" /></div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]"><EmptyMedia variant="icon"><ReceiptIcon className="h-6 w-6" /></EmptyMedia><EmptyHeader><EmptyTitle>{tAdmin("transactions.expenses.noResultsTitle")}</EmptyTitle><EmptyDescription>{tAdmin("transactions.expenses.noResultsDescription")}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={clearFilters}>{tAdmin("common.clearFilters")}</Button></EmptyContent></Empty>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={visibleExpenses}
                  getKey={(expense) => expense.id}
                  renderItem={(expense) => {
                    const cat = getCategoryMeta(expense.category);
                    const CatIcon = cat.icon;
                    return (
                      <AdminMobileCard
                        title={expense.description}
                        description={`${expense.paid_by_name} · ${formatDate(expense.expense_date)}`}
                        leading={
                          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${cat.bgColor}`}>
                            <CatIcon size={18} className={cat.color} />
                          </span>
                        }
                        badges={expense.is_settled
                          ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.settled")}</Badge>
                          : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.pending")}</Badge>}
                        meta={[
                          { label: tAdmin("common.amount"), value: <span className="font-mono tabular-nums">{formatNumber(expense.amount)} {expense.currency}</span> },
                          { label: tAdmin("common.group"), value: expense.group_name ?? tAdmin("context.friends") },
                          { label: tAdmin("transactions.expenses.category"), value: cat.name },
                          { label: "ID", value: <span className="font-mono text-xs">{expense.id.slice(0, 8)}</span> },
                        ]}
                        actions={
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { tap(); setSelectedExpense(expense); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { tap(); setEditExpenseId(expense.id); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { warning(); setDeleteExpense(expense); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        }
                        onClick={() => { tap(); setSelectedExpense(expense); setDetailOpen(true); }}
                        ariaLabel={expense.description}
                      />
                    );
                  }}
                />
                {visibleExpenses.length > 0 && (
                  <AdminMobilePagination
                    summary={tAdmin("common.pageCount", { page: table.refineCore.currentPage, total: table.refineCore.pageCount })}
                    previousLabel={tAdmin("common.previous")}
                    nextLabel={tAdmin("common.next")}
                    canPrevious={table.refineCore.currentPage > 1}
                    canNext={table.refineCore.currentPage < table.refineCore.pageCount}
                    onPrevious={() => table.refineCore.setCurrentPage(table.refineCore.currentPage - 1)}
                    onNext={() => table.refineCore.setCurrentPage(table.refineCore.currentPage + 1)}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ExpenseDetailDialog key={selectedExpense?.id ?? "expense-detail-empty"} expense={selectedExpense} open={detailOpen} onOpenChange={setDetailOpen}
        onSettlementChange={handleSettlementChange}
        onEdit={() => { setDetailOpen(false); setEditExpenseId(selectedExpense?.id ?? null); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeleteExpense(selectedExpense); setDeleteDialogOpen(true); }}
      />
      <DeleteConfirmDialog title={tAdmin("transactions.expenses.deleteTitle")} description={tAdmin("transactions.expenses.deleteDescription", { description: deleteExpense?.description ?? "", amount: formatNumber(deleteExpense?.amount ?? 0) })}
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
  const { tAdmin } = useAdminTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();
  const createMutation = useInstantCreate();
  const updateMutation = useInstantUpdate();

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
  const groups = (groupsQuery.data?.data ?? []) as GroupOption[];

  const { query: profilesQuery } = useList({ resource: "profiles", pagination: { pageSize: 200 }, meta: { select: "id, full_name" } });
  const profiles = (profilesQuery.data?.data ?? []) as ProfileOption[];

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
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
      id: "from_user", header: tAdmin("transactions.payments.sender"), accessorKey: "from_user_name", size: 180, enableSorting: false,
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
      id: "to_user", header: tAdmin("transactions.payments.receiver"), accessorKey: "to_user_name", size: 180, enableSorting: false,
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
      id: "amount", header: () => <div className="text-right">{tAdmin("common.amount")}</div>, accessorKey: "amount", size: 140,
      cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatNumber(row.original.amount)}</div>,
    },
    {
      id: "group", header: tAdmin("transactions.expenses.context"), accessorKey: "group_name", size: 140, enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.group_name ?? row.original.friendship_name ?? tAdmin("context.friends")}</span>,
    },
    {
      id: "payment_date", header: tAdmin("common.date"), accessorKey: "payment_date", size: 110,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "context_type", header: tAdmin("transactions.payments.method"), accessorKey: "context_type", size: 120, enableSorting: false,
      cell: ({ row }) => (
        <Badge className={
          row.original.context_type === "group"
            ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]"
            : "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]"
        }>{row.original.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")}</Badge>
      ),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedPayment(row.original); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditPayment(row.original); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeletePayment(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [tap, tAdmin, warning]);

  const table = useTable<PaymentRow>({
    columns,
    refineCoreProps: {
      resource: "payments",
      meta: {
        select: "*, from:profiles!payments_from_user_fkey(full_name, avatar_url), to:profiles!payments_to_user_fkey(full_name, avatar_url), groups(name), friendships(id, user_a, user_b, user_a_profile:profiles!user_a(full_name), user_b_profile:profiles!user_b(full_name))",
      },
      pagination: { pageSize: 10 },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "payment_date", order: "desc" }] },
      syncWithLocation: false,
      queryOptions: {
        select: (data) => {
          const transformed = (data.data as unknown as PaymentRecord[]).map((payment) => {
            const friendship = relationOne(payment.friendships);
            const friendshipUserA = relationOne(friendship?.user_a_profile);
            const friendshipUserB = relationOne(friendship?.user_b_profile);
            return {
              id: payment.id,
              from_user_id: payment.from_user,
              from_user_name: payment.from?.full_name ?? tAdmin("common.unknown"),
              from_user_avatar: payment.from?.avatar_url ?? null,
              to_user_id: payment.to_user,
              to_user_name: payment.to?.full_name ?? tAdmin("common.unknown"),
              to_user_avatar: payment.to?.avatar_url ?? null,
              amount: payment.amount ?? 0,
              currency: payment.currency ?? "VND",
              context_type: payment.context_type,
              group_id: payment.group_id,
              group_name: payment.groups?.name ?? null,
              friendship_id: payment.friendship_id ?? null,
              friendship_name: friendship
                ? `${friendshipUserA?.full_name ?? tAdmin("people.userA")} - ${friendshipUserB?.full_name ?? tAdmin("people.userB")}`
                : null,
              payment_date: payment.payment_date,
              note: payment.note,
              created_at: payment.created_at,
            };
          });
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
        onSuccess: () => { toast.success(tAdmin("transactions.payments.deleted", { amount: formatNumber(deletePayment.amount), currency: deletePayment.currency })); setDeleteDialogOpen(false); setDeletePayment(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsDeleting(false); },
      },
    );
  }, [deletePayment, deleteMutation, table.refineCore.tableQuery, tAdmin, warning]);

  const handleCreate = useCallback((data: PaymentFormPayload) => {
    if (!identity?.id) {
      toast.error(tAdmin("common.errorWithMessage", { message: "Missing admin identity" }));
      return;
    }
    setIsCreating(true);
    createMutation.mutate(
      {
        resource: "payments",
        values: {
          context_type: data.context_type,
          group_id: data.group_id,
          friendship_id: data.friendship_id,
          from_user: data.from_user,
          to_user: data.to_user,
          amount: data.amount,
          currency: data.currency,
          payment_date: data.payment_date,
          note: data.note || null,
          created_by: identity.id,
        },
      },
      {
        onSuccess: () => { success(); toast.success(tAdmin("transactions.payments.created")); setCreateDialogOpen(false); setIsCreating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsCreating(false); },
      },
    );
  }, [createMutation, identity, table.refineCore.tableQuery, success, tAdmin]);

  const handleEdit = useCallback((data: PaymentFormPayload) => {
    if (!editPayment) return;
    setIsUpdating(true);
    updateMutation.mutate(
      {
        resource: "payments",
        id: editPayment.id,
        values: {
          context_type: data.context_type,
          group_id: data.group_id,
          friendship_id: data.friendship_id,
          from_user: data.from_user,
          to_user: data.to_user,
          amount: data.amount,
          currency: data.currency,
          payment_date: data.payment_date,
          note: data.note || null,
        },
      },
      {
        onSuccess: () => { success(); toast.success(tAdmin("transactions.payments.updated")); setEditDialogOpen(false); setEditPayment(null); setIsUpdating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsUpdating(false); },
      },
    );
  }, [editPayment, updateMutation, table.refineCore.tableQuery, success, tAdmin]);

  const clearFilters = useCallback(() => { tap(); setSearch(""); setGroupFilter("all"); setSenderFilter("all"); setReceiverFilter("all"); setDateFrom(""); setDateTo(""); }, [tap]);
  const hasActiveFilters = search !== "" || groupFilter !== "all" || senderFilter !== "all" || receiverFilter !== "all" || dateFrom !== "" || dateTo !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visiblePayments = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div><CardTitle>{tAdmin("transactions.payments.cardTitle")}</CardTitle><CardDescription>{tAdmin("transactions.payments.cardDescription")}</CardDescription></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPageToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tAdmin("transactions.payments.searchPlaceholder")}
            filterCount={[groupFilter !== "all", senderFilter !== "all", receiverFilter !== "all", dateFrom !== "", dateTo !== ""].filter(Boolean).length}
            onFilterToggle={() => setShowFilters((v) => !v)}
            actions={
              <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {tAdmin("transactions.payments.create")}
              </Button>
            }
          />
          <AdminFilterChips
            filters={[
              ...(groupFilter !== "all" ? [{ key: "group", label: tAdmin("transactions.filterChips.group", { value: groups.find((g) => g.id === groupFilter)?.name ?? groupFilter }), onRemove: () => { tap(); setGroupFilter("all"); } }] : []),
              ...(senderFilter !== "all" ? [{ key: "sender", label: tAdmin("transactions.filterChips.sender", { value: profiles.find((p) => p.id === senderFilter)?.full_name ?? senderFilter }), onRemove: () => { tap(); setSenderFilter("all"); } }] : []),
              ...(receiverFilter !== "all" ? [{ key: "receiver", label: tAdmin("transactions.filterChips.receiver", { value: profiles.find((p) => p.id === receiverFilter)?.full_name ?? receiverFilter }), onRemove: () => { tap(); setReceiverFilter("all"); } }] : []),
              ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => setDateFrom("") }] : []),
              ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => setDateTo("") }] : []),
            ]}
            onClearAll={clearFilters}
          />
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.group")}</Label>
                  <Select value={groupFilter} onValueChange={(v) => { tap(); setGroupFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("transactions.expenses.allGroups")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("transactions.expenses.allGroups")}</SelectItem>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("transactions.payments.sender")}</Label>
                  <Select value={senderFilter} onValueChange={(v) => { tap(); setSenderFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("common.all")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("common.all")}</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("transactions.payments.receiver")}</Label>
                  <Select value={receiverFilter} onValueChange={(v) => { tap(); setReceiverFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("common.all")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("common.all")}</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]"><EmptyMedia variant="icon"><CreditCardIcon className="h-6 w-6" /></EmptyMedia><EmptyHeader><EmptyTitle>{tAdmin("transactions.payments.noResultsTitle")}</EmptyTitle><EmptyDescription>{tAdmin("transactions.payments.noResultsDescription")}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={clearFilters}>{tAdmin("common.clearFilters")}</Button></EmptyContent></Empty>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={visiblePayments}
                  getKey={(payment) => payment.id}
                  renderItem={(payment) => (
                    <AdminMobileCard
                      title={`${payment.from_user_name} -> ${payment.to_user_name}`}
                      description={formatDate(payment.payment_date)}
                      leading={<CreditCardIcon className="mt-1 h-5 w-5 text-primary" />}
                      badges={
                        <Badge className={payment.context_type === "group"
                          ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]"
                          : "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]"
                        }>
                          {payment.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")}
                        </Badge>
                      }
                      meta={[
                        { label: tAdmin("common.amount"), value: <span className="font-mono tabular-nums">{formatNumber(payment.amount)} {payment.currency}</span> },
                        { label: tAdmin("transactions.expenses.context"), value: payment.group_name ?? payment.friendship_name ?? tAdmin("context.friends") },
                        { label: tAdmin("transactions.payments.note"), value: payment.note || "—" },
                        { label: "ID", value: <span className="font-mono text-xs">{payment.id.slice(0, 8)}</span> },
                      ]}
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { tap(); setSelectedPayment(payment); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { tap(); setEditPayment(payment); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { warning(); setDeletePayment(payment); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                      onClick={() => { tap(); setSelectedPayment(payment); setDetailOpen(true); }}
                      ariaLabel={`${payment.from_user_name} ${payment.to_user_name}`}
                    />
                  )}
                />
                {visiblePayments.length > 0 && (
                  <AdminMobilePagination
                    summary={tAdmin("common.pageCount", { page: table.refineCore.currentPage, total: table.refineCore.pageCount })}
                    previousLabel={tAdmin("common.previous")}
                    nextLabel={tAdmin("common.next")}
                    canPrevious={table.refineCore.currentPage > 1}
                    canNext={table.refineCore.currentPage < table.refineCore.pageCount}
                    onPrevious={() => table.refineCore.setCurrentPage(table.refineCore.currentPage - 1)}
                    onNext={() => table.refineCore.setCurrentPage(table.refineCore.currentPage + 1)}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PaymentDetailDialog payment={selectedPayment} open={detailOpen} onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); setEditPayment(selectedPayment); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeletePayment(selectedPayment); setDeleteDialogOpen(true); }}
      />
      <DeleteConfirmDialog title={tAdmin("transactions.payments.deleteTitle")} description={tAdmin("transactions.payments.deleteDescription", { amount: formatNumber(deletePayment?.amount ?? 0), currency: deletePayment?.currency ?? "VND", from: deletePayment?.from_user_name ?? "", to: deletePayment?.to_user_name ?? "" })}
        open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeletePayment(null); } }} onConfirm={handleDelete} isDeleting={isDeleting}
      />
      <CreatePaymentDialog key={createDialogOpen ? "create-payment-open" : "create-payment-closed"} open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={handleCreate} isCreating={isCreating} />
      <EditPaymentDialog key={editPayment?.id ?? "edit-payment-empty"} payment={editPayment} open={editDialogOpen} onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditPayment(null); } }} onSubmit={handleEdit} isUpdating={isUpdating} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN EXPORT ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export function AdminTransactions() {
  const isMobile = useIsMobile();
  const { tAdmin } = useAdminTranslation();
  const [activeTab, setActiveTab] = useState<"expenses" | "payments" | "notifications">("expenses");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tAdmin("transactions.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tAdmin("transactions.subtitle")}</p>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        {isMobile ? (
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <SelectTrigger className="mb-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expenses">{tAdmin("transactions.expensesTab")}</SelectItem>
              <SelectItem value="payments">{tAdmin("transactions.paymentsTab")}</SelectItem>
              <SelectItem value="notifications">{tAdmin("transactions.notificationsTab")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <TabsList>
            <TabsTrigger value="expenses" className="gap-2">
              <ReceiptIcon className="h-4 w-4" />
              {tAdmin("transactions.expensesTab")}
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCardIcon className="h-4 w-4" />
              {tAdmin("transactions.paymentsTab")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <BellIcon className="h-4 w-4" />
              {tAdmin("transactions.notificationsTab")}
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <AdminNotifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}
