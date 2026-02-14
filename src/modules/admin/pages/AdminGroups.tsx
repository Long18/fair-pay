import { useMemo, useState, useCallback, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { useDelete, useUpdate } from "@refinedev/core";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  GroupIcon,
  MoreHorizontalIcon,
  Loader2Icon,
  AlertTriangleIcon,
  PencilIcon,
  UserPlusIcon,
  UserMinusIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface GroupRow {
  id: string;
  name: string;
  created_by: string;
  creator_name: string;
  creator_avatar: string | null;
  member_count: number;
  total_expenses: number;
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

// ─── Group Detail Sheet ─────────────────────────────────────────────

function GroupDetailSheet({
  group,
  open,
  onOpenChange,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null; role: string }>>([]);
  const [expenses, setExpenses] = useState<Array<{ id: string; description: string; amount: number; expense_date: string; paid_by_name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Add member state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const fetchMembers = useCallback(() => {
    if (!group) return;
    setLoadingMembers(true);
    supabaseClient
      .from("group_members")
      .select("role, profiles!group_members_user_id_fkey(id, full_name, avatar_url)")
      .eq("group_id", group.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setMembers(
            data.map((m: any) => ({
              id: m.profiles?.id ?? "",
              full_name: m.profiles?.full_name ?? "Không rõ",
              avatar_url: m.profiles?.avatar_url ?? null,
              role: m.role ?? "member",
            })),
          );
        }
        setLoadingMembers(false);
      });
  }, [group?.id]);

  useEffect(() => {
    if (!group || !open) {
      setMembers([]);
      setExpenses([]);
      return;
    }

    fetchMembers();

    // Fetch recent expenses
    setLoadingExpenses(true);
    supabaseClient
      .from("expenses")
      .select("id, description, amount, expense_date, profiles!expenses_paid_by_user_id_fkey(full_name)")
      .eq("group_id", group.id)
      .order("expense_date", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) {
          setExpenses(
            data.map((e: any) => ({
              id: e.id,
              description: e.description ?? "",
              amount: e.amount ?? 0,
              expense_date: e.expense_date,
              paid_by_name: e.profiles?.full_name ?? "Không rõ",
            })),
          );
        }
        setLoadingExpenses(false);
      });
  }, [group?.id, open, fetchMembers]);

  // Fetch all profiles when add member dialog opens
  useEffect(() => {
    if (!addMemberOpen) return;
    supabaseClient
      .from("profiles")
      .select("id, full_name, avatar_url")
      .order("full_name")
      .then(({ data }) => {
        if (data) setAllProfiles(data);
      });
  }, [addMemberOpen]);

  // Filter out existing members from the add list
  const availableProfiles = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    return allProfiles.filter((p) => !memberIds.has(p.id));
  }, [allProfiles, members]);

  const handleAddMember = useCallback(async () => {
    if (!group || !selectedUserId) return;
    setAddingMember(true);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .insert({ group_id: group.id, user_id: selectedUserId, role: "member" });
      if (error) {
        if (error.code === "23505") {
          toast.error("Người dùng đã là thành viên của nhóm");
        } else {
          throw error;
        }
      } else {
        toast.success("Đã thêm thành viên vào nhóm");
        setAddMemberOpen(false);
        setSelectedUserId("");
        fetchMembers();
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  }, [group, selectedUserId, fetchMembers]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!group) return;
    setRemovingMemberId(userId);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Đã xóa thành viên khỏi nhóm");
      fetchMembers();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setRemovingMemberId(null);
    }
  }, [group, fetchMembers]);

  if (!group) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{group.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Tạo bởi {group.creator_name} · {formatDate(group.created_at)}
            </p>
          </SheetHeader>

          <Tabs defaultValue="members" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="members" className="flex-1">Thành viên ({members.length})</TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1">Chi phí</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{members.length} thành viên</span>
                <Button size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}>
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Thêm
                </Button>
              </div>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Không có thành viên
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                        <AvatarFallback className="text-xs">
                          {m.full_name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                      </div>
                      <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {m.role === "admin" ? "Admin" : "Member"}
                      </Badge>
                      {m.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={removingMemberId === m.id}
                        >
                          {removingMemberId === m.id ? (
                            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinusIcon className="h-3.5 w-3.5" />
                          )}
                          <span className="sr-only">Xóa thành viên</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="mt-4">
              <div className="space-y-3">
                <DetailRow label="Tổng chi phí" value={formatNumber(group.total_expenses)} />
                {loadingExpenses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Chưa có chi phí nào
                  </p>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.paid_by_name} · {formatDate(e.expense_date)}
                          </p>
                        </div>
                        <span className="text-sm font-mono tabular-nums ml-3">
                          {formatNumber(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm thành viên</DialogTitle>
            <DialogDescription>
              Thêm người dùng vào nhóm &ldquo;{group.name}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label htmlFor="add-member-select">Chọn người dùng</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="add-member-select">
                <SelectValue placeholder="Chọn người dùng..." />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.length === 0 ? (
                  <SelectItem value="__none" disabled>Không còn người dùng nào</SelectItem>
                ) : (
                  availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddMemberOpen(false)} disabled={addingMember}>
              Hủy
            </Button>
            <Button onClick={handleAddMember} disabled={addingMember || !selectedUserId}>
              {addingMember ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

// ─── Delete Confirmation Dialog ─────────────────────────────────────

function DeleteGroupDialog({
  group,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!group) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa nhóm &ldquo;{group.name}&rdquo;?
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

// ─── Edit Group Name Dialog ─────────────────────────────────────────

function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onConfirm,
  isUpdating,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newName: string) => void;
  isUpdating: boolean;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (group && open) {
      setName(group.name);
    }
  }, [group, open]);

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi tên nhóm</DialogTitle>
          <DialogDescription>
            Thay đổi tên hiển thị của nhóm &ldquo;{group.name}&rdquo;
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          <Label htmlFor="group-name">Tên nhóm</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên nhóm mới..."
          />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Hủy
          </Button>
          <Button
            onClick={() => onConfirm(name.trim())}
            disabled={isUpdating || !name.trim() || name.trim() === group.name}
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
          Đổi tên nhóm
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          Xóa nhóm
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminGroups() {
  const deleteMutation = useDelete();
  const updateMutation = useUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<GroupRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit state
  const [editGroup, setEditGroup] = useState<GroupRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Build filters for Refine useTable
  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (debouncedSearch) {
      f.push({
        field: "name",
        operator: "contains",
        value: debouncedSearch,
      });
    }
    return f;
  }, [debouncedSearch]);

  // ─── Column Definitions ─────────────────────────────────────────

  const columns = useMemo<ColumnDef<GroupRow>[]>(
    () => [
      {
        id: "name",
        header: "Tên nhóm",
        accessorKey: "name",
        size: 200,
      },
      {
        id: "creator",
        header: "Người tạo",
        accessorKey: "creator_name",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={row.original.creator_avatar ?? undefined}
                alt={row.original.creator_name}
              />
              <AvatarFallback className="text-xs">
                {row.original.creator_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.creator_name}</span>
          </div>
        ),
      },
      {
        id: "member_count",
        header: "Thành viên",
        accessorKey: "member_count",
        size: 100,
        cell: ({ getValue }) => (
          <Badge variant="secondary">{getValue() as number}</Badge>
        ),
      },
      {
        id: "total_expenses",
        header: () => <div className="text-right">Tổng chi phí</div>,
        accessorKey: "total_expenses",
        size: 140,
        cell: ({ getValue }) => (
          <div className="text-right font-mono tabular-nums">
            {formatNumber(getValue() as number)}
          </div>
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
            onViewDetail={() => {
              setSelectedGroup(row.original);
              setSheetOpen(true);
            }}
            onEdit={() => {
              setEditGroup(row.original);
              setEditDialogOpen(true);
            }}
            onDelete={() => {
              setDeleteGroup(row.original);
              setDeleteDialogOpen(true);
            }}
          />
        ),
      },
    ],
    [],
  );

  // ─── Table Setup ────────────────────────────────────────────────

  const table = useTable<GroupRow>({
    columns,
    refineCoreProps: {
      resource: "groups",
      meta: {
        select: "*, profiles!groups_created_by_fkey(full_name, avatar_url), group_members(count)",
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
          const transformed = data.data.map((group: any) => ({
            id: group.id,
            name: group.name ?? "",
            created_by: group.created_by ?? "",
            creator_name: group.profiles?.full_name ?? "Không rõ",
            creator_avatar: group.profiles?.avatar_url ?? null,
            member_count: group.group_members?.[0]?.count ?? 0,
            total_expenses: group.total_expenses ?? 0,
            created_at: group.created_at,
          }));

          return {
            ...data,
            data: transformed,
          };
        },
      },
    },
  });

  // ─── Delete Handler ─────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!deleteGroup) return;

    setIsDeleting(true);
    deleteMutation.mutate(
      {
        resource: "groups",
        id: deleteGroup.id,
      },
      {
        onSuccess: () => {
          toast.success(`Đã xóa nhóm "${deleteGroup.name}"`);
          setDeleteDialogOpen(false);
          setDeleteGroup(null);
          setIsDeleting(false);
          table.refineCore.tableQuery.refetch();
        },
        onError: (error) => {
          toast.error(`Lỗi: ${error.message}`);
          setIsDeleting(false);
        },
      },
    );
  }, [deleteGroup, deleteMutation, table.refineCore.tableQuery]);

  // ─── Edit Handler ───────────────────────────────────────────────

  const handleEdit = useCallback(
    (newName: string) => {
      if (!editGroup || !newName) return;

      setIsUpdating(true);
      updateMutation.mutate(
        {
          resource: "groups",
          id: editGroup.id,
          values: { name: newName },
        },
        {
          onSuccess: () => {
            toast.success(`Đã đổi tên nhóm thành "${newName}"`);
            setEditDialogOpen(false);
            setEditGroup(null);
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
    [editGroup, updateMutation, table.refineCore.tableQuery],
  );

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setSearch("");
  }, []);

  const hasActiveFilters = search !== "";
  const isEmptyResult =
    !table.refineCore.tableQuery.isLoading &&
    table.reactTable.getRowModel().rows.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Quản lý nhóm</CardTitle>
            <CardDescription>
              Xem và quản lý tất cả nhóm trong hệ thống
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên nhóm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Data Table or Empty State */}
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <GroupIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không tìm thấy nhóm</EmptyTitle>
                <EmptyDescription>
                  Thử thay đổi từ khóa tìm kiếm
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

      {/* Group Detail Sheet */}
      <GroupDetailSheet
        group={selectedGroup}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteGroupDialog
        group={deleteGroup}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteDialogOpen(false);
            setDeleteGroup(null);
          }
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {/* Edit Group Name Dialog */}
      <EditGroupDialog
        group={editGroup}
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isUpdating) {
            setEditDialogOpen(false);
            setEditGroup(null);
          }
        }}
        onConfirm={handleEdit}
        isUpdating={isUpdating}
      />
    </div>
  );
}
