import { useMemo, useState, useCallback, useEffect } from "react";
import { useGetIdentity, useUpdate } from "@refinedev/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { flexRender } from "@tanstack/react-table";

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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  SearchIcon,
  UsersIcon,
  MoreHorizontalIcon,
  FilterIcon,
  AlertTriangleIcon,
  Loader2Icon,
  UserPlusIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import { supabaseClient } from "@/utility/supabaseClient";
import type { Profile } from "@/modules/profile/types";
import type { AdminUserRow } from "../types";

// ─── Debounce Hook ──────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── User Detail Sheet ──────────────────────────────────────────────

function UserDetailSheet({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [groups, setGroups] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (!user || !open) {
      setGroups([]);
      return;
    }

    setLoadingGroups(true);
    supabaseClient
      .from("group_members")
      .select("role, groups!group_members_group_id_fkey(id, name)")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setGroups(
            data.map((m: any) => ({
              id: m.groups?.id ?? "",
              name: m.groups?.name ?? "Không rõ",
              role: m.role ?? "member",
            })),
          );
        }
        setLoadingGroups(false);
      });
  }, [user?.id, open]);

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
              <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{user.full_name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
            <TabsTrigger value="groups" className="flex-1">Groups ({groups.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="space-y-3">
              <DetailRow label="Email" value={user.email} />
              <DetailRow
                label="Vai trò"
                value={
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "Admin" : "User"}
                  </Badge>
                }
              />
              <DetailRow label="Ngày tạo" value={formatDate(user.created_at)} />
              <DetailRow label="ID" value={user.id} />
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            {loadingGroups ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Chưa tham gia nhóm nào
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{g.name}</span>
                    <Badge variant={g.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {g.role === "admin" ? "Admin" : "Member"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
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

// ─── Delete User Dialog ─────────────────────────────────────────────

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Xác nhận xóa người dùng</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa người dùng &ldquo;{user.full_name}&rdquo; ({user.email})?
            Tất cả dữ liệu liên quan (chi phí, thanh toán, nhóm) sẽ bị xóa theo.
            Hành động này không thể hoàn tác.
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

// ─── Create User Dialog ──────────────────────────────────────────────

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { full_name: string; email: string; role: string }) => void;
  isCreating: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  useEffect(() => {
    if (!open) {
      setFullName("");
      setEmail("");
      setRole("user");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!fullName || !email) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    onSubmit({ full_name: fullName, email, role });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo người dùng mới</DialogTitle>
          <DialogDescription>Thêm hồ sơ người dùng mới vào hệ thống</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="user-name">Họ tên</Label>
            <Input id="user-name" placeholder="Nhập họ tên..." value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Vai trò</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isCreating || !fullName || !email}>
            {isCreating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tạo người dùng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ───────────────────────────────────────────────

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { full_name: string; email: string }) => void;
  isUpdating: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user && open) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
  }, [user, open]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
          <DialogDescription>Cập nhật thông tin người dùng &ldquo;{user.full_name}&rdquo;</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Họ tên</Label>
            <Input id="edit-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">Email</Label>
            <Input id="edit-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Hủy</Button>
          <Button onClick={() => onSubmit({ full_name: fullName, email })} disabled={isUpdating || !fullName || !email}>
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
  user,
  isSelf,
  onViewDetail,
  onEdit,
  onToggleRole,
  onDelete,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onViewDetail: () => void;
  onEdit: () => void;
  onToggleRole: () => void;
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
          Chỉnh sửa hồ sơ
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onToggleRole}
          disabled={isSelf}
        >
          {isSelf
            ? "Không thể đổi vai trò"
            : user.role === "admin"
              ? "Hạ cấp thành User"
              : "Nâng cấp thành Admin"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          disabled={isSelf}
          className="text-destructive"
        >
          {isSelf ? "Không thể xóa chính mình" : "Xóa người dùng"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── New Registration Card ──────────────────────────────────────────

function NewRegistrationCard({
  user,
  onViewDetail,
}: {
  user: AdminUserRow;
  onViewDetail: () => void;
}) {
  const daysSinceRegistration = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onViewDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onViewDetail(); }}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
        <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{formatDate(user.created_at)}</p>
        <Badge
          variant="secondary"
          className={
            daysSinceRegistration <= 1
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-xs mt-1"
              : daysSinceRegistration <= 7
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 text-xs mt-1"
                : "text-xs mt-1"
          }
        >
          {daysSinceRegistration === 0
            ? "Hôm nay"
            : daysSinceRegistration === 1
              ? "Hôm qua"
              : `${daysSinceRegistration} ngày trước`}
        </Badge>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminUsers() {
  const { data: identity } = useGetIdentity<Profile>();
  const updateMutation = useUpdate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all-users");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [regPeriod, setRegPeriod] = useState<string>("7");

  // Create state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ─── Fetch Users ────────────────────────────────────────────────

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_admin_users");
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    staleTime: 30_000,
  });

  // ─── New Registrations ──────────────────────────────────────────

  const newRegistrations = useMemo(() => {
    if (!usersData) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(regPeriod));
    return usersData
      .filter((u) => new Date(u.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [usersData, regPeriod]);

  // ─── Column Definitions ─────────────────────────────────────────

  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        id: "avatar",
        header: "",
        accessorKey: "avatar_url",
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.original.avatar_url ?? undefined}
              alt={row.original.full_name}
            />
            <AvatarFallback className="text-xs">
              {row.original.full_name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        ),
      },
      {
        id: "full_name",
        header: "Tên",
        accessorKey: "full_name",
        size: 180,
      },
      {
        id: "email",
        header: "Email",
        accessorKey: "email",
        size: 220,
      },
      {
        id: "role",
        header: "Vai trò",
        accessorFn: (row) => row.role,
        size: 100,
        cell: ({ row }) => (
          <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
            {row.original.role === "admin" ? "Admin" : "User"}
          </Badge>
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
            user={row.original}
            isSelf={identity?.id === row.original.id}
            onViewDetail={() => {
              setSelectedUser(row.original);
              setSheetOpen(true);
            }}
            onEdit={() => {
              setEditUser(row.original);
              setEditDialogOpen(true);
            }}
            onToggleRole={() => handleToggleRole(row.original)}
            onDelete={() => {
              setDeleteUser(row.original);
              setDeleteDialogOpen(true);
            }}
          />
        ),
      },
    ],
    [identity?.id],
  );

  // ─── Client-side filtering ──────────────────────────────────────

  const filteredData = useMemo(() => {
    let result = usersData ?? [];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [usersData, debouncedSearch, roleFilter]);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  const reactTable = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // ─── Role Toggle Handler ────────────────────────────────────────

  const handleToggleRole = useCallback(
    (user: AdminUserRow) => {
      if (identity?.id === user.id) {
        toast.warning("Không thể thay đổi vai trò của chính mình");
        return;
      }

      const newRole = user.role === "admin" ? "user" : "admin";
      updateMutation.mutate(
        {
          resource: "user_roles",
          id: user.id,
          values: { role: newRole },
        },
        {
          onSuccess: () => {
            toast.success(
              `Đã ${newRole === "admin" ? "nâng cấp" : "hạ cấp"} vai trò của ${user.full_name}`,
            );
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
          },
          onError: (error) => {
            toast.error(`Lỗi: ${error.message}`);
          },
        },
      );
    },
    [identity?.id, updateMutation, queryClient],
  );

  // ─── Delete User Handler ────────────────────────────────────────

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUser) return;

    setIsDeleting(true);
    try {
      // Delete from profiles (cascades to related data)
      const { error } = await supabaseClient
        .from("profiles")
        .delete()
        .eq("id", deleteUser.id);

      if (error) throw error;

      toast.success(`Đã xóa người dùng "${deleteUser.full_name}"`);
      setDeleteDialogOpen(false);
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể xóa người dùng"}`);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteUser, queryClient]);

  // ─── Create User Handler ────────────────────────────────────────

  const handleCreateUser = useCallback(async (data: { full_name: string; email: string; role: string }) => {
    setIsCreating(true);
    try {
      // Create profile directly (admin-created user without auth account)
      const { error } = await supabaseClient
        .from("profiles")
        .insert({
          full_name: data.full_name,
          email: data.email,
        });
      if (error) throw error;

      // If role is admin, also set user_roles (need the new profile id)
      if (data.role === "admin") {
        const { data: newProfile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", data.email)
          .single();
        if (newProfile) {
          await supabaseClient
            .from("user_roles")
            .upsert({ user_id: newProfile.id, role: "admin" });
        }
      }

      toast.success(`Đã tạo người dùng "${data.full_name}"`);
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể tạo người dùng"}`);
    } finally {
      setIsCreating(false);
    }
  }, [queryClient]);

  // ─── Edit User Handler ──────────────────────────────────────────

  const handleEditUser = useCallback(async (data: { full_name: string; email: string }) => {
    if (!editUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ full_name: data.full_name, email: data.email })
        .eq("id", editUser.id);
      if (error) throw error;

      toast.success(`Đã cập nhật hồ sơ "${data.full_name}"`);
      setEditDialogOpen(false);
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể cập nhật hồ sơ"}`);
    } finally {
      setIsUpdating(false);
    }
  }, [editUser, queryClient]);

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
    setRoleFilter("all");
  }, []);

  const hasActiveFilters = search !== "" || roleFilter !== "all";
  const isEmptyResult =
    !isLoading &&
    reactTable.getRowModel().rows.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all-users" className="gap-2">
            <UsersIcon className="h-4 w-4" />
            Tất cả người dùng
          </TabsTrigger>
          <TabsTrigger value="new-registrations" className="gap-2">
            <UserPlusIcon className="h-4 w-4" />
            Đăng ký mới
            {newRegistrations.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {newRegistrations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── All Users Tab ──────────────────────────────────────── */}
        <TabsContent value="all-users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Quản lý người dùng</CardTitle>
                <CardDescription>
                  Xem và quản lý tất cả người dùng trong hệ thống
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Tạo người dùng
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
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter Bar */}
              {showFilters && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả vai trò</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Xóa bộ lọc
                    </Button>
                  )}
                </div>
              )}

              {/* Data Table or Empty State */}
              {isEmptyResult && hasActiveFilters ? (
                <Empty className="min-h-[400px]">
                  <EmptyMedia variant="icon">
                    <UsersIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>Không tìm thấy người dùng</EmptyTitle>
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
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {reactTable.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} style={{ width: header.getSize() }}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            Đang tải...
                          </TableCell>
                        </TableRow>
                      ) : reactTable.getRowModel().rows.length ? (
                        reactTable.getRowModel().rows.map((row) => (
                          <TableRow key={row.original?.id ?? row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                                <div className="truncate">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && reactTable.getRowModel().rows.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Trang {reactTable.getState().pagination.pageIndex + 1} / {reactTable.getPageCount()}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactTable.previousPage()}
                      disabled={!reactTable.getCanPreviousPage()}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactTable.nextPage()}
                      disabled={!reactTable.getCanNextPage()}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── New Registrations Tab ──────────────────────────────── */}
        <TabsContent value="new-registrations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Đăng ký mới</CardTitle>
                <CardDescription>
                  Người dùng mới đăng ký trong khoảng thời gian đã chọn
                </CardDescription>
              </div>
              <Select value={regPeriod} onValueChange={setRegPeriod}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hôm nay</SelectItem>
                  <SelectItem value="7">7 ngày qua</SelectItem>
                  <SelectItem value="30">30 ngày qua</SelectItem>
                  <SelectItem value="90">90 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : newRegistrations.length === 0 ? (
                <Empty className="min-h-[300px]">
                  <EmptyMedia variant="icon">
                    <UserPlusIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>Không có đăng ký mới</EmptyTitle>
                    <EmptyDescription>
                      Không có người dùng nào đăng ký trong khoảng thời gian này
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    {newRegistrations.length} người dùng mới
                  </p>
                  {newRegistrations.map((user) => (
                    <NewRegistrationCard
                      key={user.id}
                      user={user}
                      onViewDetail={() => {
                        setSelectedUser(user);
                        setSheetOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        user={deleteUser}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteDialogOpen(false);
            setDeleteUser(null);
          }
        }}
        onConfirm={handleDeleteUser}
        isDeleting={isDeleting}
      />

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateUser}
        isCreating={isCreating}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editUser}
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isUpdating) {
            setEditDialogOpen(false);
            setEditUser(null);
          }
        }}
        onSubmit={handleEditUser}
        isUpdating={isUpdating}
      />
    </div>
  );
}
