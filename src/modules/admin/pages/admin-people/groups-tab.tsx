import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetIdentity, type CrudFilters } from "@refinedev/core";
import { useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import { useHaptics } from "@/hooks/use-haptics";
import { useTable } from "@refinedev/react-table";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
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
import { AdminMobileCard, AdminMobileCards } from "../../components/AdminMobileCards";
import { AdminMasterDetail } from "../../components/AdminMasterDetail";
import { useAdminTranslation } from "../../i18n";
import type { GroupRow, GroupListRecord } from "./types";
import { GroupDetailPanel } from "./group-detail-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { EditGroupDialog } from "./edit-group-dialog";
import { CreateGroupSheet } from "./create-group-sheet";
import { PeopleTable } from "./people-table";
import { PeoplePagination } from "./people-pagination";
import { PEOPLE_DEFAULT_PAGE_SIZE } from "./utils";

type GroupRowActionHandlers = {
  onViewDetail: (group: GroupRow) => void;
  onEdit: (group: GroupRow) => void;
  onArchiveToggle: (group: GroupRow) => void;
  onDelete: (group: GroupRow) => void;
};

function GroupRowActions({
  group,
  isArchiving,
  compact = false,
  onViewDetail,
  onEdit,
  onArchiveToggle,
  onDelete,
}: GroupRowActionHandlers & { group: GroupRow; isArchiving: boolean; compact?: boolean }) {
  const { tAdmin } = useAdminTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={compact ? "h-8 w-8" : "h-9 w-9 cursor-pointer"}
          aria-label={tAdmin("common.actions")}
        >
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetail(group)}>{tAdmin("common.details")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(group)}>
          <PencilIcon className="mr-2 h-4 w-4" />{tAdmin("people.editGroup")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onArchiveToggle(group)} disabled={isArchiving}>
          {group.is_archived ? (
            <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />{tAdmin("people.restore")}</>
          ) : (
            <><ArchiveIcon className="mr-2 h-4 w-4" />{tAdmin("people.archive")}</>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(group)} className="text-destructive">
          {tAdmin("people.deleteGroup")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupsMobileList({
  groups,
  isArchiving,
  ...rowActions
}: GroupRowActionHandlers & { groups: GroupRow[]; isArchiving: boolean }) {
  const { tAdmin } = useAdminTranslation();

  return (
    <AdminMobileCards
      items={groups}
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
          actions={<GroupRowActions group={group} isArchiving={isArchiving} {...rowActions} />}
          onClick={() => rowActions.onViewDetail(group)}
          ariaLabel={group.name}
        />
      )}
    />
  );
}

export function GroupsTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();
  const updateMutation = useInstantUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Detail pane
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

  // Columns are needed to build the table, but the archive handler needs the table's refetch.
  const archiveToggleRef = useRef<(group: GroupRow) => void>(() => {});
  const rowActions = useMemo<GroupRowActionHandlers>(() => ({
    onViewDetail: (group) => { tap(); setSelectedGroup(group); setDetailOpen(true); },
    onEdit: (group) => { tap(); setEditGroup(group); setEditDialogOpen(true); },
    onArchiveToggle: (group) => archiveToggleRef.current(group),
    onDelete: (group) => { warning(); setDeleteGroup(group); setDeleteDialogOpen(true); },
  }), [tap, warning]);

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
        <GroupRowActions group={row.original} isArchiving={isArchiving} compact {...rowActions} />
      ),
    },
  ], [isArchiving, rowActions, tAdmin]);

  const table = useTable<GroupRow>({
    columns,
    initialState: { columnPinning: { right: ["actions"] } },
    refineCoreProps: {
      resource: "groups",
      meta: { select: "*, profiles!groups_created_by_fkey(full_name, avatar_url), group_members(count)" },
      pagination: { pageSize: PEOPLE_DEFAULT_PAGE_SIZE },
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
          if (detailOpen && selectedGroup?.id === group.id) {
            setSelectedGroup({ ...group, is_archived: newArchived });
          }
        },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsArchiving(false); },
      },
    );
  }, [detailOpen, identity?.id, selectedGroup, table.refineCore.tableQuery, tAdmin, updateMutation]);

  useEffect(() => {
    archiveToggleRef.current = handleArchiveToggle;
  }, [handleArchiveToggle]);

  const clearFilters = useCallback(() => setSearch(""), []);
  const hasActiveFilters = search !== "";
  const isTableLoading = table.refineCore.tableQuery.isLoading;
  const isEmptyResult = !isTableLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleGroups = table.reactTable.getRowModel().rows.map((row) => row.original);
  const detailGroup = visibleGroups.find((g) => g.id === selectedGroup?.id) ?? selectedGroup;

  const detailShell = detailGroup
    ? {
        title: detailGroup.name,
        description: tAdmin("people.createdBy", { name: detailGroup.creator_name, date: formatDate(detailGroup.created_at) }),
        footer: (
          <Button size="sm" onClick={() => rowActions.onEdit(detailGroup)}>
            <PencilIcon className="mr-1.5 h-4 w-4" />
            {tAdmin("people.editGroup")}
          </Button>
        ),
        detail: (
          <GroupDetailPanel
            group={detailGroup}
            onDelete={() => { setDetailOpen(false); rowActions.onDelete(detailGroup); }}
            onArchiveToggle={() => handleArchiveToggle(detailGroup)}
          />
        ),
      }
    : { title: "", detail: null };

  const master = (
    <div className="flex min-w-0 flex-col gap-3">
      <AdminPageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tAdmin("people.groupSearchPlaceholder")}
        actions={
          <Button size="sm" className="h-10 sm:h-9" onClick={() => { tap(); setCreateGroupOpen(true); }}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            {tAdmin("people.createGroupSubmit")}
          </Button>
        }
      />
      {isTableLoading ? (
        <AdminTableSkeleton rows={7} columns={6} />
      ) : isEmptyResult && hasActiveFilters ? (
        <AdminEmptyState
          icon={<GroupIcon className="h-8 w-8" />}
          title={tAdmin("people.noGroupsTitle")}
          description={tAdmin("people.noGroupsDescription")}
          action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
          className="min-h-[200px] py-6"
        />
      ) : (
        <>
          <PeopleTable
            table={table.reactTable}
            offset="15.5rem"
            getRowId={(group) => group.id}
            emptyLabel={tAdmin("common.noData")}
            selectedId={detailOpen ? detailGroup?.id : null}
            onRowClick={rowActions.onViewDetail}
          />
          <div className="md:hidden">
            <GroupsMobileList groups={visibleGroups} isArchiving={isArchiving} {...rowActions} />
          </div>
        </>
      )}
      {!isTableLoading && visibleGroups.length > 0 && (
        <PeoplePagination
          page={table.refineCore.currentPage}
          pageCount={table.refineCore.pageCount}
          pageSize={table.refineCore.pageSize}
          total={table.refineCore.tableQuery.data?.total}
          onPageChange={(page) => table.refineCore.setCurrentPage(page)}
          onPageSizeChange={(size) => { table.refineCore.setPageSize(size); table.refineCore.setCurrentPage(1); }}
        />
      )}
    </div>
  );

  return (
    <>
      <AdminMasterDetail
        id="people-groups"
        master={master}
        open={detailOpen && !!detailGroup}
        onOpenChange={setDetailOpen}
        {...detailShell}
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
