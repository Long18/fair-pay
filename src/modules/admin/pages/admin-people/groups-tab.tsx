import { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetIdentity, type CrudFilters } from "@refinedev/core";
import { useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import { useHaptics } from "@/hooks/use-haptics";
import { useTable } from "@refinedev/react-table";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  GroupIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import type { Profile } from "@/modules/profile/types";
import { AdminPageToolbar } from "../../components/AdminPageToolbar";
import { AdminTableSkeleton } from "../../components/AdminTableSkeleton";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "../../components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import type { GroupRow, GroupListRecord } from "./types";
import { GroupDetailDialog } from "./group-detail-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { EditGroupDialog } from "./edit-group-dialog";
import { CreateGroupSheet } from "./create-group-sheet";

export function GroupsTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();
  const updateMutation = useInstantUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Detail dialog
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete
  const [deleteGroup, setDeleteGroup] = useState<GroupRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit
  const [editGroup, setEditGroup] = useState<GroupRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Create
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  // Archive
  const [isArchiving, setIsArchiving] = useState(false);

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    if (debouncedSearch) f.push({ field: "name", operator: "contains", value: debouncedSearch });
    return f;
  }, [debouncedSearch]);

  const columns = useMemo<ColumnDef<GroupRow>[]>(() => [
    {
      id: "name", header: tAdmin("people.groupName"), accessorKey: "name", size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={row.original.avatar_url ?? undefined} alt={row.original.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {row.original.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{row.original.name}</span>
              {row.original.is_archived && (
                <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] text-[10px] px-1.5 py-0">
                  {tAdmin("status.archived")}
                </Badge>
              )}
            </div>
            {row.original.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{row.original.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "creator", header: tAdmin("people.creator"), accessorKey: "creator_name", size: 160, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.creator_avatar ?? undefined} alt={row.original.creator_name} />
            <AvatarFallback className="text-xs">{row.original.creator_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.creator_name}</span>
        </div>
      ),
    },
    {
      id: "member_count", header: tAdmin("common.members"), accessorKey: "member_count", size: 90,
      cell: ({ getValue }) => <Badge variant="secondary">{getValue() as number}</Badge>,
    },
    {
      id: "total_expenses", header: () => <div className="text-right">{tAdmin("people.totalExpenses")}</div>, accessorKey: "total_expenses", size: 130,
      cell: ({ getValue }) => <div className="text-right font-mono tabular-nums">{formatNumber(getValue() as number)}</div>,
    },
    {
      id: "created_at", header: tAdmin("common.createdAt"), accessorKey: "created_at", size: 110,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedGroup(row.original); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditGroup(row.original); setEditDialogOpen(true); }}>
              <PencilIcon className="mr-2 h-4 w-4" />{tAdmin("people.editGroup")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleArchiveToggle(row.original)} disabled={isArchiving}>
              {row.original.is_archived ? (
                <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />{tAdmin("people.restore")}</>
              ) : (
                <><ArchiveIcon className="mr-2 h-4 w-4" />{tAdmin("people.archive")}</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteGroup(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteGroup")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [isArchiving, tAdmin, tap, warning]);

  const table = useTable<GroupRow>({
    columns,
    refineCoreProps: {
      resource: "groups",
      meta: { select: "*, profiles!groups_created_by_fkey(full_name, avatar_url), group_members(count)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      queryOptions: {
        select: (data) => ({
          ...data,
          data: (data.data as GroupListRecord[]).map((group) => ({
            id: group.id,
            name: group.name ?? "",
            description: group.description ?? null,
            avatar_url: group.avatar_url ?? null,
            created_by: group.created_by ?? "",
            creator_name: group.profiles?.full_name ?? tAdmin("common.unknown"),
            creator_avatar: group.profiles?.avatar_url ?? null,
            member_count: group.group_members?.[0]?.count ?? 0,
            total_expenses: group.total_expenses ?? 0,
            is_archived: group.is_archived ?? false,
            created_at: group.created_at,
          })),
        }),
      },
    },
  });

  const handleDelete = useCallback(() => {
    if (!deleteGroup) return;
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "groups", id: deleteGroup.id },
      {
        onSuccess: () => { toast.success(tAdmin("people.success.groupDeleted", { name: deleteGroup.name })); setDeleteDialogOpen(false); setDeleteGroup(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsDeleting(false); },
      },
    );
  }, [deleteGroup, deleteMutation, table.refineCore.tableQuery, tAdmin]);

  const handleEdit = useCallback((data: { name: string; description: string; avatar_url: string | null }) => {
    if (!editGroup || !data.name) return;
    setIsUpdating(true);
    updateMutation.mutate(
      {
        resource: "groups",
        id: editGroup.id,
        values: {
          name: data.name,
          description: data.description || null,
          avatar_url: data.avatar_url,
        },
      },
      {
        onSuccess: () => { toast.success(tAdmin("people.success.groupUpdated", { name: data.name })); setEditDialogOpen(false); setEditGroup(null); setIsUpdating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsUpdating(false); },
      },
    );
  }, [editGroup, updateMutation, table.refineCore.tableQuery, tAdmin]);

  const handleArchiveToggle = useCallback((group: GroupRow) => {
    setIsArchiving(true);
    const newArchived = !group.is_archived;
    updateMutation.mutate(
      {
        resource: "groups",
        id: group.id,
        values: {
          is_archived: newArchived,
          archived_at: newArchived ? new Date().toISOString() : null,
          archived_by: newArchived ? identity?.id ?? null : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(newArchived
            ? tAdmin("people.success.groupArchived", { name: group.name })
            : tAdmin("people.success.groupRestored", { name: group.name }));
          setIsArchiving(false);
          table.refineCore.tableQuery.refetch();
          // Also refresh detail dialog if open
          if (detailOpen && selectedGroup?.id === group.id) {
            setSelectedGroup({ ...group, is_archived: newArchived });
          }
        },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsArchiving(false); },
      },
    );
  }, [detailOpen, identity?.id, selectedGroup, table.refineCore.tableQuery, tAdmin, updateMutation]);

  const clearFilters = useCallback(() => setSearch(""), []);
  const hasActiveFilters = search !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleGroups = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{tAdmin("people.groupsCardTitle")}</CardTitle>
            <CardDescription>{tAdmin("people.groupsCardDescription")}</CardDescription>
          </div>
          <Button size="sm" onClick={() => { tap(); setCreateGroupOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {tAdmin("people.createGroupSubmit")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPageToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tAdmin("people.groupSearchPlaceholder")}
          />
          {table.refineCore.tableQuery.isLoading ? (
            <AdminTableSkeleton rows={7} columns={6} />
          ) : isEmptyResult && hasActiveFilters ? (
            <AdminEmptyState
              icon={<GroupIcon className="h-8 w-8" />}
              title={tAdmin("people.noGroupsTitle")}
              description={tAdmin("people.noGroupsDescription")}
              action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={visibleGroups}
                  getKey={(group) => group.id}
                  renderItem={(group) => (
                    <AdminMobileCard
                      title={group.name}
                      description={group.description || tAdmin("people.createdBy", { name: group.creator_name, date: formatDate(group.created_at) })}
                      leading={
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
                          <AvatarFallback className="text-sm bg-primary/10 text-primary">
                            {group.name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      }
                      badges={group.is_archived ? (
                        <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] text-xs">
                          {tAdmin("status.archived")}
                        </Badge>
                      ) : undefined}
                      meta={[
                        { label: tAdmin("common.members"), value: group.member_count },
                        { label: tAdmin("people.totalExpenses"), value: <span className="font-mono tabular-nums">{formatNumber(group.total_expenses)}</span> },
                        { label: tAdmin("people.creator"), value: group.creator_name },
                        { label: tAdmin("common.createdAt"), value: formatDate(group.created_at) },
                      ]}
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { tap(); setSelectedGroup(group); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { tap(); setEditGroup(group); setEditDialogOpen(true); }}>
                              <PencilIcon className="mr-2 h-4 w-4" />{tAdmin("people.editGroup")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveToggle(group)}>
                              {group.is_archived ? (
                                <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />{tAdmin("people.restore")}</>
                              ) : (
                                <><ArchiveIcon className="mr-2 h-4 w-4" />{tAdmin("people.archive")}</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { warning(); setDeleteGroup(group); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteGroup")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                      onClick={() => { tap(); setSelectedGroup(group); setDetailOpen(true); }}
                      ariaLabel={group.name}
                    />
                  )}
                />
                {visibleGroups.length > 0 && (
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

      <GroupDetailDialog
        group={selectedGroup}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); setEditGroup(selectedGroup); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeleteGroup(selectedGroup); setDeleteDialogOpen(true); }}
        onArchiveToggle={() => { if (selectedGroup) handleArchiveToggle(selectedGroup); }}
      />
      <DeleteConfirmDialog
        title={tAdmin("people.deleteGroupTitle")}
        description={tAdmin("people.deleteGroupDescription", { name: deleteGroup?.name ?? "" })}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteGroup(null); } }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <EditGroupDialog key={editGroup?.id ?? "edit-group-empty"} group={editGroup} open={editDialogOpen} onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditGroup(null); } }} onConfirm={handleEdit} isUpdating={isUpdating} />
      <CreateGroupSheet
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onCreated={() => table.refineCore.tableQuery.refetch()}
        createdBy={identity?.id ?? ""}
      />
    </>
  );
}
