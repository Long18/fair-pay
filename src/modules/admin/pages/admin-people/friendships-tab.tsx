import { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetIdentity, type CrudFilters } from "@refinedev/core";
import { useInstantDelete } from "@/hooks/use-instant-mutation";
import { useHaptics } from "@/hooks/use-haptics";
import { useTable } from "@refinedev/react-table";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "../../components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import type { FriendshipRow, FriendshipListRecord } from "./types";
import { getErrorMessage, relationOne } from "./utils";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { CreateFriendshipSheet } from "./create-friendship-sheet";
import { EditFriendshipSheet } from "./edit-friendship-sheet";
import { FRIENDSHIP_STATUS } from "./utils";
import { FriendshipStatusBadge } from "./friendship-status-badge";

export function FriendshipsTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.status === "pending" && (
              <DropdownMenuItem onClick={() => { tap(); handleAccept(row.original); }}>{tAdmin("people.acceptFriendship")}</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { tap(); setEditFriendship(row.original); }}>
              <PencilIcon className="mr-2 h-4 w-4" />
              {tAdmin("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteFriendship(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteFriendship")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [tAdmin, tap, warning]);

  const table = useTable<FriendshipRow>({
    columns,
    refineCoreProps: {
      resource: "friendships",
      meta: { select: "*, user_a_profile:profiles!friendships_user_a_fkey(full_name, avatar_url), user_b_profile:profiles!friendships_user_b_fkey(full_name, avatar_url)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      queryOptions: {
        select: (data) => {
          const searchTerm = debouncedSearch.trim();
          const transformed = (data.data as unknown as FriendshipListRecord[]).map((f) => {
            const userA = relationOne(f.user_a_profile);
            const userB = relationOne(f.user_b_profile);
            return {
              id: f.id,
              user_a_id: f.user_a,
              user_a_name: userA?.full_name ?? tAdmin("common.unknown"),
              user_a_avatar: userA?.avatar_url ?? null,
              user_b_id: f.user_b,
              user_b_name: userB?.full_name ?? tAdmin("common.unknown"),
              user_b_avatar: userB?.avatar_url ?? null,
              status: f.status,
              created_at: f.created_at,
            };
          });
          const filtered = searchTerm
            ? transformed.filter((friendship) =>
                matchesSearchFields(
                  searchTerm,
                  friendship.id,
                  friendship.user_a_name,
                  friendship.user_b_name,
                ),
              )
            : transformed;
          return { ...data, data: filtered, total: searchTerm ? filtered.length : data.total };
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

  const clearFilters = useCallback(() => { setSearch(""); setStatusFilter("all"); }, []);
  const hasActiveFilters = search !== "" || statusFilter !== "all";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleFriendships = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{tAdmin("people.friendshipsCardTitle")}</CardTitle>
            <CardDescription>{tAdmin("people.friendshipsCardDescription")}</CardDescription>
          </div>
          <Button size="sm" onClick={() => { tap(); setCreateFriendshipOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {tAdmin("people.createFriendshipSubmit")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPageToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tAdmin("people.friendshipSearchPlaceholder")}
            filterCount={statusFilter !== "all" ? 1 : 0}
          />
          <AdminFilterChips
            filters={[
              ...(statusFilter !== "all"
                ? [{ key: "status", label: tAdmin("people.statusFilter", { status: tAdmin(`status.${statusFilter}`) }), onRemove: () => { tap(); setStatusFilter("all"); } }]
                : []),
            ]}
            onClearAll={() => { tap(); clearFilters(); }}
          />
          {table.refineCore.tableQuery.isLoading ? (
            <AdminTableSkeleton rows={7} columns={5} />
          ) : isEmptyResult && hasActiveFilters ? (
            <AdminEmptyState
              icon={<HeartHandshakeIcon className="h-8 w-8" />}
              title={tAdmin("people.noFriendshipsTitle")}
              description={tAdmin("people.noFriendshipsDescription")}
              action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={visibleFriendships}
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
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {friendship.status === "pending" && (
                              <DropdownMenuItem onClick={() => { tap(); handleAccept(friendship); }}>{tAdmin("people.acceptFriendship")}</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { tap(); setEditFriendship(friendship); }}>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              {tAdmin("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { warning(); setDeleteFriendship(friendship); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteFriendship")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  )}
                />
                {visibleFriendships.length > 0 && (
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

      <DeleteConfirmDialog
        title={tAdmin("people.deleteFriendshipTitle")}
        description={tAdmin("people.deleteFriendshipDescription", { userA: deleteFriendship?.user_a_name ?? "", userB: deleteFriendship?.user_b_name ?? "" })}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteFriendship(null); } }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
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
