import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useDelete } from "@refinedev/core";
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
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  SearchIcon,
  HeartHandshakeIcon,
  MoreHorizontalIcon,
  Loader2Icon,
  AlertTriangleIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface FriendshipRow {
  id: string;
  user_a_id: string;
  user_a_name: string;
  user_a_avatar: string | null;
  user_b_id: string;
  user_b_name: string;
  user_b_avatar: string | null;
  status: "pending" | "accepted" | "rejected";
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

// ─── Status Badge ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  accepted: {
    label: "Đã chấp nhận",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  },
  pending: {
    label: "Chờ xử lý",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  rejected: {
    label: "Từ chối",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

// ─── Delete Confirmation Dialog ─────────────────────────────────────

function DeleteFriendshipDialog({
  friendship,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  friendship: FriendshipRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!friendship) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa tình bạn giữa &ldquo;{friendship.user_a_name}&rdquo; và
            &ldquo;{friendship.user_b_name}&rdquo;? Hành động này không thể hoàn tác.
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

// ─── Row Actions ────────────────────────────────────────────────────

function RowActions({
  status,
  onAccept,
  onDelete,
}: {
  status: string;
  onAccept: () => void;
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
        {status === "pending" && (
          <DropdownMenuItem onClick={onAccept}>
            Chấp nhận kết bạn
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          Xóa tình bạn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminFriendships() {
  const deleteMutation = useDelete();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteFriendship, setDeleteFriendship] = useState<FriendshipRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Build filters for Refine useTable
  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (statusFilter !== "all") {
      f.push({ field: "status", operator: "eq", value: statusFilter });
    }
    return f;
  }, [statusFilter]);

  // ─── Column Definitions ─────────────────────────────────────────

  const columns = useMemo<ColumnDef<FriendshipRow>[]>(
    () => [
      {
        id: "user_a",
        header: "Người dùng A",
        accessorKey: "user_a_name",
        size: 200,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={row.original.user_a_avatar ?? undefined}
                alt={row.original.user_a_name}
              />
              <AvatarFallback className="text-xs">
                {row.original.user_a_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.user_a_name}</span>
          </div>
        ),
      },
      {
        id: "user_b",
        header: "Người dùng B",
        accessorKey: "user_b_name",
        size: 200,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={row.original.user_b_avatar ?? undefined}
                alt={row.original.user_b_name}
              />
              <AvatarFallback className="text-xs">
                {row.original.user_b_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.user_b_name}</span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        accessorKey: "status",
        size: 140,
        cell: ({ getValue }) => (
          <StatusBadge status={getValue() as keyof typeof STATUS_CONFIG} />
        ),
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
            status={row.original.status}
            onAccept={() => handleAccept(row.original)}
            onDelete={() => {
              setDeleteFriendship(row.original);
              setDeleteDialogOpen(true);
            }}
          />
        ),
      },
    ],
    [],
  );

  // ─── Table Setup ────────────────────────────────────────────────

  const table = useTable<FriendshipRow>({
    columns,
    refineCoreProps: {
      resource: "friendships",
      meta: {
        select:
          "*, user_a_profile:profiles!friendships_user_a_fkey(full_name, avatar_url), user_b_profile:profiles!friendships_user_b_fkey(full_name, avatar_url)",
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
          const transformed = data.data.map((friendship: any) => ({
            id: friendship.id,
            user_a_id: friendship.user_a,
            user_a_name: friendship.user_a_profile?.full_name ?? "Không rõ",
            user_a_avatar: friendship.user_a_profile?.avatar_url ?? null,
            user_b_id: friendship.user_b,
            user_b_name: friendship.user_b_profile?.full_name ?? "Không rõ",
            user_b_avatar: friendship.user_b_profile?.avatar_url ?? null,
            status: friendship.status,
            created_at: friendship.created_at,
          }));

          return { ...data, data: transformed };
        },
      },
    },
  });

  // ─── Delete Handler ─────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!deleteFriendship) return;

    setIsDeleting(true);
    deleteMutation.mutate(
      {
        resource: "friendships",
        id: deleteFriendship.id,
      },
      {
        onSuccess: () => {
          toast.success(
            `Đã xóa tình bạn giữa "${deleteFriendship.user_a_name}" và "${deleteFriendship.user_b_name}"`,
          );
          setDeleteDialogOpen(false);
          setDeleteFriendship(null);
          setIsDeleting(false);
          table.refineCore.tableQuery.refetch();
        },
        onError: (error) => {
          toast.error(`Lỗi: ${error.message}`);
          setIsDeleting(false);
        },
      },
    );
  }, [deleteFriendship, deleteMutation, table.refineCore.tableQuery]);

  // ─── Accept Handler ──────────────────────────────────────────────

  const handleAccept = useCallback(
    async (friendship: FriendshipRow) => {
      try {
        const { data, error } = await supabaseClient.rpc("admin_accept_friendship", {
          p_friendship_id: friendship.id,
        });
        if (error) throw error;
        toast.success(
          `Đã chấp nhận kết bạn giữa "${friendship.user_a_name}" và "${friendship.user_b_name}"`,
        );
        table.refineCore.tableQuery.refetch();
      } catch (err: any) {
        toast.error(`Lỗi: ${err.message ?? "Không thể chấp nhận kết bạn"}`);
      }
    },
    [table.refineCore.tableQuery],
  );

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
  }, []);

  const hasActiveFilters = search !== "" || statusFilter !== "all";
  const isEmptyResult =
    !table.refineCore.tableQuery.isLoading &&
    table.reactTable.getRowModel().rows.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Quản lý tình bạn</CardTitle>
            <CardDescription>
              Xem và quản lý tất cả kết nối bạn bè trong hệ thống
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search + Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-sm flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên người dùng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="accepted">Đã chấp nhận</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {/* Data Table or Empty State */}
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <HeartHandshakeIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không tìm thấy tình bạn</EmptyTitle>
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

      {/* Delete Confirmation Dialog */}
      <DeleteFriendshipDialog
        friendship={deleteFriendship}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteDialogOpen(false);
            setDeleteFriendship(null);
          }
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
