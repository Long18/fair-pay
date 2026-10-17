import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetIdentity, type CrudFilters } from "@refinedev/core";
import { useInstantDelete } from "@/hooks/use-instant-mutation";
import { useHaptics } from "@/hooks/use-haptics";
import { useTable } from "@refinedev/react-table";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HeartHandshakeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import { matchesSearchFields } from "@/lib/search-utils";
import type { Profile } from "@/modules/profile/types";
import { AdminPageToolbar } from "../../components/AdminPageToolbar";
import { AdminFilterChips } from "../../components/AdminFilterChips";
import { AdminTableSkeleton } from "../../components/AdminTableSkeleton";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import { AdminMobileCard, AdminMobileCards } from "../../components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import type { FriendshipRow, FriendshipListRecord } from "./types";
import { getErrorMessage, relationOne, PEOPLE_DEFAULT_PAGE_SIZE } from "./utils";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { CreateFriendshipSheet } from "./create-friendship-sheet";
import { EditFriendshipSheet } from "./edit-friendship-sheet";
import { FRIENDSHIP_STATUS } from "./utils";
import { FriendshipStatusBadge } from "./friendship-status-badge";
import { PeopleTable } from "./people-table";
import { PeoplePagination } from "./people-pagination";

/** Maps API records to rows and applies the client-side search; `total` is set only when searching. */
function toFriendshipRows(records: FriendshipListRecord[], searchTerm: string, unknownLabel: string) {
  const rows: FriendshipRow[] = records.map((f) => {
    const userA = relationOne(f.user_a_profile);
    const userB = relationOne(f.user_b_profile);
    return {
      id: f.id,
      user_a_id: f.user_a,
      user_a_name: userA?.full_name ?? unknownLabel,
      user_a_avatar: userA?.avatar_url ?? null,
      user_b_id: f.user_b,
      user_b_name: userB?.full_name ?? unknownLabel,
      user_b_avatar: userB?.avatar_url ?? null,
      status: f.status,
      created_at: f.created_at,
    };
  });
  if (!searchTerm) return { rows, total: undefined };
  const filtered = rows.filter((friendship) =>
    matchesSearchFields(searchTerm, friendship.id, friendship.user_a_name, friendship.user_b_name),
  );
  return { rows: filtered, total: filtered.length };
}

type FriendshipRowActionHandlers = {
  onAccept: (friendship: FriendshipRow) => void;
  onEdit: (friendship: FriendshipRow) => void;
  onDelete: (friendship: FriendshipRow) => void;
};

function FriendshipRowActions({
  friendship,
  compact = false,
  onAccept,
  onEdit,
  onDelete,
}: FriendshipRowActionHandlers & { friendship: FriendshipRow; compact?: boolean }) {
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
        {friendship.status === "pending" && (
          <DropdownMenuItem onClick={() => onAccept(friendship)}>{tAdmin("people.acceptFriendship")}</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit(friendship)}>
          <PencilIcon className="mr-2 h-4 w-4" />
          {tAdmin("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(friendship)} className="text-destructive">
          {tAdmin("people.deleteFriendship")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FriendshipStatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="people-friendship-status-filter" className="text-xs text-muted-foreground">
        {tAdmin("common.status")}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="people-friendship-status-filter" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tAdmin("layout.people.allStatuses")}</SelectItem>
          {(Object.keys(FRIENDSHIP_STATUS) as Array<keyof typeof FRIENDSHIP_STATUS>).map((status) => (
            <SelectItem key={status} value={status}>
              {tAdmin(FRIENDSHIP_STATUS[status].labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FriendshipDeleteDialog({
  friendship,
  open,
  isDeleting,
  onClose,
  onConfirm,
}: {
  friendship: FriendshipRow | null;
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <DeleteConfirmDialog
      title={tAdmin("people.deleteFriendshipTitle")}
      description={tAdmin("people.deleteFriendshipDescription", { userA: friendship?.user_a_name ?? "", userB: friendship?.user_b_name ?? "" })}
      open={open}
      onOpenChange={(o) => { if (!o && !isDeleting) onClose(); }}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}

function FriendshipsMobileList({
  friendships,
  ...rowActions
}: FriendshipRowActionHandlers & { friendships: FriendshipRow[] }) {
  const { tAdmin } = useAdminTranslation();

  return (
    <AdminMobileCards
      items={friendships}
      getKey={(friendship) => friendship.id}
      renderItem={(friendship) => (
        <AdminMobileCard
          title={`${friendship.user_a_name} - ${friendship.user_b_name}`}
          description={<span className="font-mono text-xs">{friendship.id.slice(0, 8)}</span>}
          leading={<HeartHandshakeIcon className="mt-1 h-5 w-5 text-primary" />}
          badges={<FriendshipStatusBadge status={friendship.status} />}
          meta={[
            { label: tAdmin("people.userA"), value: friendship.user_a_name },
            { label: tAdmin("people.userB"), value: friendship.user_b_name },
            { label: tAdmin("common.status"), value: tAdmin(`status.${friendship.status}`) },
            { label: tAdmin("common.createdAt"), value: formatDate(friendship.created_at) },
          ]}
          actions={<FriendshipRowActions friendship={friendship} {...rowActions} />}
        />
      )}
    />
  );
}

export function FriendshipsTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const [deleteFriendship, setDeleteFriendship] = useState<FriendshipRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createFriendshipOpen, setCreateFriendshipOpen] = useState(false);
  const [editFriendship, setEditFriendship] = useState<FriendshipRow | null>(null);

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    if (statusFilter !== "all") f.push({ field: "status", operator: "eq", value: statusFilter });
    return f;
  }, [statusFilter]);

  // Columns are needed to build the table, but accepting needs the table's refetch.
  const acceptRef = useRef<(friendship: FriendshipRow) => Promise<void>>(async () => {});
  const rowActions = useMemo<FriendshipRowActionHandlers>(() => ({
    onAccept: (friendship) => { tap(); void acceptRef.current(friendship); },
    onEdit: (friendship) => { tap(); setEditFriendship(friendship); },
    onDelete: (friendship) => { warning(); setDeleteFriendship(friendship); setDeleteDialogOpen(true); },
  }), [tap, warning]);

  const columns = useMemo<ColumnDef<FriendshipRow>[]>(() => [
    {
      id: "user_a", header: tAdmin("people.userA"), accessorKey: "user_a_name", size: 200, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.user_a_avatar ?? undefined} alt={row.original.user_a_name} />
            <AvatarFallback className="text-xs">{row.original.user_a_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.user_a_name}</span>
        </div>
      ),
    },
    {
      id: "user_b", header: tAdmin("people.userB"), accessorKey: "user_b_name", size: 200, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.user_b_avatar ?? undefined} alt={row.original.user_b_name} />
            <AvatarFallback className="text-xs">{row.original.user_b_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.user_b_name}</span>
        </div>
      ),
    },
    {
      id: "status", header: tAdmin("common.status"), accessorKey: "status", size: 140,
      cell: ({ getValue }) => <FriendshipStatusBadge status={getValue() as keyof typeof FRIENDSHIP_STATUS} />,
    },
    {
      id: "created_at", header: tAdmin("common.createdAt"), accessorKey: "created_at", size: 120,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => <FriendshipRowActions friendship={row.original} compact {...rowActions} />,
    },
  ], [rowActions, tAdmin]);

  const table = useTable<FriendshipRow>({
    columns,
    initialState: { columnPinning: { right: ["actions"] } },
    refineCoreProps: {
      resource: "friendships",
      meta: { select: "*, user_a_profile:profiles!friendships_user_a_fkey(full_name, avatar_url), user_b_profile:profiles!friendships_user_b_fkey(full_name, avatar_url)" },
      pagination: { pageSize: PEOPLE_DEFAULT_PAGE_SIZE },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      queryOptions: {
        select: (data) => {
          const { rows, total } = toFriendshipRows(
            data.data as unknown as FriendshipListRecord[],
            debouncedSearch.trim(),
            tAdmin("common.unknown"),
          );
          return { ...data, data: rows, total: total ?? data.total };
        },
      },
    },
  });

  const handleDelete = useCallback(() => {
    if (!deleteFriendship) return;
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "friendships", id: deleteFriendship.id },
      {
        onSuccess: () => { toast.success(tAdmin("people.success.friendshipDeleted", { userA: deleteFriendship.user_a_name, userB: deleteFriendship.user_b_name })); setDeleteDialogOpen(false); setDeleteFriendship(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsDeleting(false); },
      },
    );
  }, [deleteFriendship, deleteMutation, table.refineCore.tableQuery, tAdmin]);

  const handleAccept = useCallback(async (friendship: FriendshipRow) => {
    try {
      const { error } = await supabaseClient.rpc("admin_accept_friendship", { p_friendship_id: friendship.id });
      if (error) throw error;
      toast.success(tAdmin("people.success.friendshipAccepted", { userA: friendship.user_a_name, userB: friendship.user_b_name }));
      table.refineCore.tableQuery.refetch();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.acceptFriendshipFailed")) }));
    }
  }, [table.refineCore.tableQuery, tAdmin]);

  useEffect(() => {
    acceptRef.current = handleAccept;
  }, [handleAccept]);

  const clearFilters = useCallback(() => { setSearch(""); setStatusFilter("all"); }, []);
  const hasStatusFilter = statusFilter !== "all";
  const hasActiveFilters = search !== "" || hasStatusFilter;
  const isTableLoading = table.refineCore.tableQuery.isLoading;
  const isEmptyResult = !isTableLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleFriendships = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>
      <div className="flex min-w-0 flex-col gap-3">
        <AdminPageToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={tAdmin("people.friendshipSearchPlaceholder")}
          filterCount={hasStatusFilter ? 1 : 0}
          filterContent={
            <FriendshipStatusFilter
              value={statusFilter}
              onChange={(value) => { tap(); setStatusFilter(value); setFilterOpen(false); }}
            />
          }
          filterOpen={filterOpen}
          onFilterOpenChange={setFilterOpen}
          actions={
            <Button size="sm" className="h-10 sm:h-9" onClick={() => { tap(); setCreateFriendshipOpen(true); }}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {tAdmin("people.createFriendshipSubmit")}
            </Button>
          }
        />
        <AdminFilterChips
          filters={[
            ...(hasStatusFilter
              ? [{ key: "status", label: tAdmin("people.statusFilter", { status: tAdmin(`status.${statusFilter}`) }), onRemove: () => { tap(); setStatusFilter("all"); } }]
              : []),
          ]}
          onClearAll={() => { tap(); clearFilters(); }}
        />
        {isTableLoading ? (
          <AdminTableSkeleton rows={7} columns={5} />
        ) : isEmptyResult && hasActiveFilters ? (
          <AdminEmptyState
            icon={<HeartHandshakeIcon className="h-8 w-8" />}
            title={tAdmin("people.noFriendshipsTitle")}
            description={tAdmin("people.noFriendshipsDescription")}
            action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
            className="min-h-[200px] py-6"
          />
        ) : (
          <>
            <PeopleTable
              table={table.reactTable}
              offset={hasStatusFilter ? "17.75rem" : "15.5rem"}
              getRowId={(friendship) => friendship.id}
              emptyLabel={tAdmin("common.noData")}
            />
            <div className="md:hidden">
              <FriendshipsMobileList friendships={visibleFriendships} {...rowActions} />
            </div>
          </>
        )}
        {!isTableLoading && visibleFriendships.length > 0 && (
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

      <FriendshipDeleteDialog
        friendship={deleteFriendship}
        open={deleteDialogOpen}
        isDeleting={isDeleting}
        onClose={() => { setDeleteDialogOpen(false); setDeleteFriendship(null); }}
        onConfirm={handleDelete}
      />
      <CreateFriendshipSheet
        open={createFriendshipOpen}
        onOpenChange={setCreateFriendshipOpen}
        onCreated={() => table.refineCore.tableQuery.refetch()}
        createdBy={identity?.id ?? ""}
      />
      <EditFriendshipSheet
        key={editFriendship?.id ?? "edit-friendship-empty"}
        friendship={editFriendship}
        open={!!editFriendship}
        onOpenChange={(v) => { if (!v) setEditFriendship(null); }}
        onUpdated={() => table.refineCore.tableQuery.refetch()}
      />
    </>
  );
}
