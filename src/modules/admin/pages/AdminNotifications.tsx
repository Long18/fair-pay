import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useList } from "@refinedev/core";
import { useInstantDelete, useInstantCreate, useInstantUpdate } from "@/hooks/use-instant-mutation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  MoreHorizontalIcon,
  PlusIcon,
  PencilIcon,
  AlertTriangleIcon,
  Loader2Icon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import { supabaseClient } from "@/utility/supabaseClient";
import { useHaptics } from "@/hooks/use-haptics";

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

// ─── Delete Notification Dialog ─────────────────────────────────────

function DeleteNotificationDialog({
  notification,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  notification: NotificationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!notification) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Xác nhận xóa thông báo</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa thông báo &ldquo;{notification.message.slice(0, 60)}...&rdquo;
            gửi đến {notification.user_name}? Hành động này không thể hoàn tác.
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

// ─── Create Notification Dialog ─────────────────────────────────────

function CreateNotificationDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { user_id: string; type: string; title: string; message: string }) => void;
  isCreating: boolean;
}) {
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("settlement_reminder");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const { tap } = useHaptics();

  // Fetch profiles for user selection
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string }>>([]);
  useEffect(() => {
    if (!open) return;
    supabaseClient
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => {
        if (data) setProfiles(data);
      });
  }, [open]);

  const handleSubmit = () => {
    if (!userId || !title || !message) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    onSubmit({ user_id: userId, type, title, message });
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setUserId("");
      setType("settlement_reminder");
      setTitle("");
      setMessage("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo thông báo mới</DialogTitle>
          <DialogDescription>
            Gửi thông báo đến người dùng trong hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="notif-user">Người nhận</Label>
            <Select value={userId} onValueChange={(v) => { tap(); setUserId(v); }}>
              <SelectTrigger id="notif-user">
                <SelectValue placeholder="Chọn người nhận" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-type">Loại thông báo</Label>
            <Select value={type} onValueChange={(v) => { tap(); setType(v); }}>
              <SelectTrigger id="notif-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-title">Tiêu đề</Label>
            <Input
              id="notif-title"
              placeholder="Tiêu đề thông báo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-message">Nội dung</Label>
            <Textarea
              id="notif-message"
              placeholder="Nội dung thông báo..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { tap(); onOpenChange(false); }} disabled={isCreating}>
            Hủy
          </Button>
          <Button onClick={() => { tap(); handleSubmit(); }} disabled={isCreating || !userId || !title || !message}>
            {isCreating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Gửi thông báo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Notification Dialog ───────────────────────────────────────

function EditNotificationDialog({
  notification,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
}: {
  notification: NotificationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { type: string; title: string; message: string }) => void;
  isUpdating: boolean;
}) {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const { tap } = useHaptics();

  useEffect(() => {
    if (notification && open) {
      setType(notification.type);
      setTitle(notification.title);
      setMessage(notification.message);
    }
  }, [notification, open]);

  if (!notification) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông báo</DialogTitle>
          <DialogDescription>
            Cập nhật nội dung thông báo gửi đến {notification.user_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-notif-type">Loại thông báo</Label>
            <Select value={type} onValueChange={(v) => { tap(); setType(v); }}>
              <SelectTrigger id="edit-notif-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notif-title">Tiêu đề</Label>
            <Input
              id="edit-notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notif-message">Nội dung</Label>
            <Textarea
              id="edit-notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { tap(); onOpenChange(false); }} disabled={isUpdating}>
            Hủy
          </Button>
          <Button
            onClick={() => { tap(); onSubmit({ type, title, message }); }}
            disabled={isUpdating || !title || !message}
          >
            {isUpdating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row Actions ────────────────────────────────────────────────────

function RowActions({
  onEdit,
  onDelete,
}: {
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
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon className="mr-2 h-4 w-4" />
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          Xóa thông báo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminNotifications() {
  const deleteMutation = useInstantDelete();
  const createMutation = useInstantCreate();
  const updateMutation = useInstantUpdate();
  const { tap, success, warning } = useHaptics();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Delete state
  const [deleteNotification, setDeleteNotification] = useState<NotificationRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editNotification, setEditNotification] = useState<NotificationRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
      {
        id: "actions",
        header: "",
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            onEdit={() => {
              setEditNotification(row.original);
              setEditDialogOpen(true);
            }}
            onDelete={() => {
              setDeleteNotification(row.original);
              setDeleteDialogOpen(true);
            }}
          />
        ),
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
    tap();
    setSearch("");
    setTypeFilter("all");
    setReadFilter("all");
    setDateFrom("");
    setDateTo("");
  }, [tap]);

  const hasActiveFilters =
    search !== "" ||
    typeFilter !== "all" ||
    readFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const isEmptyResult =
    !table.refineCore.tableQuery.isLoading &&
    table.reactTable.getRowModel().rows.length === 0;

  // ─── Delete Handler ─────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!deleteNotification) return;
    warning();
    setIsDeleting(true);
    deleteMutation.mutate(
      {
        resource: "notifications",
        id: deleteNotification.id,
      },
      {
        onSuccess: () => {
          toast.success("Đã xóa thông báo");
          setDeleteDialogOpen(false);
          setDeleteNotification(null);
          setIsDeleting(false);
          table.refineCore.tableQuery.refetch();
        },
        onError: (error) => {
          toast.error(`Lỗi: ${error.message}`);
          setIsDeleting(false);
        },
      },
    );
  }, [deleteNotification, deleteMutation, table.refineCore.tableQuery, warning]);

  // ─── Create Handler ─────────────────────────────────────────────

  const handleCreate = useCallback(
    (data: { user_id: string; type: string; title: string; message: string }) => {
      setIsCreating(true);
      createMutation.mutate(
        {
          resource: "notifications",
          values: {
            user_id: data.user_id,
            type: data.type,
            title: data.title,
            message: data.message,
            is_read: false,
          },
        },
        {
          onSuccess: () => {
            success();
            toast.success("Đã tạo thông báo mới");
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
    [createMutation, table.refineCore.tableQuery, success],
  );

  // ─── Edit Handler ───────────────────────────────────────────────

  const handleEdit = useCallback(
    (data: { type: string; title: string; message: string }) => {
      if (!editNotification) return;
      setIsUpdating(true);
      updateMutation.mutate(
        {
          resource: "notifications",
          id: editNotification.id,
          values: {
            type: data.type,
            title: data.title,
            message: data.message,
          },
        },
        {
          onSuccess: () => {
            success();
            toast.success("Đã cập nhật thông báo");
            setEditDialogOpen(false);
            setEditNotification(null);
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
    [editNotification, updateMutation, table.refineCore.tableQuery, success],
  );

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
              size="sm"
              onClick={() => { tap(); setCreateDialogOpen(true); }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Tạo thông báo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { tap(); setShowFilters((v) => !v); }}
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
                  <Select value={typeFilter} onValueChange={(v) => { tap(); setTypeFilter(v); }}>
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
                  <Select value={readFilter} onValueChange={(v) => { tap(); setReadFilter(v); }}>
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

      {/* Delete Notification Dialog */}
      <DeleteNotificationDialog
        notification={deleteNotification}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteDialogOpen(false);
            setDeleteNotification(null);
          }
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {/* Create Notification Dialog */}
      <CreateNotificationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isCreating={isCreating}
      />

      {/* Edit Notification Dialog */}
      <EditNotificationDialog
        notification={editNotification}
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isUpdating) {
            setEditDialogOpen(false);
            setEditNotification(null);
          }
        }}
        onSubmit={handleEdit}
        isUpdating={isUpdating}
      />
    </div>
  );
}
