import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useGetIdentity, useUpdate } from "@refinedev/core";
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
  UsersIcon,
  MoreHorizontalIcon,
  FilterIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
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
            <TabsTrigger value="groups" className="flex-1">Groups</TabsTrigger>
            <TabsTrigger value="balances" className="flex-1">Balances</TabsTrigger>
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
            <p className="text-sm text-muted-foreground text-center py-8">
              Chức năng xem nhóm sẽ được bổ sung sau.
            </p>
          </TabsContent>

          <TabsContent value="balances" className="mt-4">
            <p className="text-sm text-muted-foreground text-center py-8">
              Chức năng xem số dư sẽ được bổ sung sau.
            </p>
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

// ─── Row Actions ────────────────────────────────────────────────────

function RowActions({
  user,
  isSelf,
  onViewDetail,
  onToggleRole,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onViewDetail: () => void;
  onToggleRole: () => void;
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminUsers() {
  const { data: identity } = useGetIdentity<Profile>();
  const updateMutation = useUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Build filters for Refine useTable
  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (debouncedSearch) {
      f.push({
        field: "full_name",
        operator: "contains",
        value: debouncedSearch,
      });
    }
    return f;
  }, [debouncedSearch]);

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
            onToggleRole={() => handleToggleRole(row.original)}
          />
        ),
      },
    ],
    [identity?.id],
  );

  // ─── Table Setup ────────────────────────────────────────────────

  const table = useTable<AdminUserRow>({
    columns,
    refineCoreProps: {
      resource: "profiles",
      meta: { select: "*, user_roles(role)" },
      pagination: { pageSize: 10 },
      filters: {
        permanent: filters as any,
      },
      sorters: {
        initial: [{ field: "created_at", order: "desc" }],
      },
      queryOptions: {
        select: (data) => {
          // Transform the joined data to flatten user_roles
          const transformed = data.data.map((profile: any) => ({
            id: profile.id,
            full_name: profile.full_name ?? "",
            email: profile.email ?? "",
            avatar_url: profile.avatar_url,
            role: profile.user_roles?.[0]?.role ?? "user",
            created_at: profile.created_at,
          }));

          // Apply client-side role filter
          const filtered =
            roleFilter === "all"
              ? transformed
              : transformed.filter((u: AdminUserRow) => u.role === roleFilter);

          return {
            ...data,
            data: filtered,
            total: roleFilter === "all" ? data.total : filtered.length,
          };
        },
      },
    },
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
            table.refineCore.tableQuery.refetch();
          },
          onError: (error) => {
            toast.error(`Lỗi: ${error.message}`);
          },
        },
      );
    },
    [identity?.id, updateMutation, table.refineCore.tableQuery],
  );

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
    setRoleFilter("all");
  }, []);

  const hasActiveFilters = search !== "" || roleFilter !== "all";
  const isEmptyResult =
    !table.refineCore.tableQuery.isLoading &&
    table.reactTable.getRowModel().rows.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
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
              placeholder="Tìm kiếm theo tên..."
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
            <DataTable table={table} />
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
