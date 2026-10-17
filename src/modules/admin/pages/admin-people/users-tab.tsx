import { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetIdentity, useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UsersIcon, PlusIcon, ActivityIcon, PencilIcon } from "@/components/ui/icons";
import { matchesSearchFields } from "@/lib/search-utils";
import type { Profile } from "@/modules/profile/types";
import type { AdminUserRow } from "../../types";
import { AdminPageToolbar } from "../../components/AdminPageToolbar";
import { AdminFilterChips } from "../../components/AdminFilterChips";
import { AdminTableSkeleton } from "../../components/AdminTableSkeleton";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import { AdminMasterDetail } from "../../components/AdminMasterDetail";
import {
  PostCreateConnectionsDialog,
  type PostCreateUserRef,
} from "../../components/PostCreateConnectionsDialog";
import { useAdminTranslation } from "../../i18n";
import { formatSystemRole, PEOPLE_DEFAULT_PAGE_SIZE } from "./utils";
import { UserDetailPanel } from "./user-detail-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { MergeUserDialog } from "./merge-user-dialog";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { NewRegistrationsPopover } from "./new-registration-card";
import { createUsersTabColumns, NEW_REG_DAYS } from "./users-tab-columns";
import { UsersMobileList } from "./users-mobile-list";
import { useUsersTabActions } from "./use-users-tab-actions";
import type { UsersRowActionHandlers } from "./users-row-actions";
import { PeopleTable } from "./people-table";
import { PeoplePagination } from "./people-pagination";

const SYSTEM_ROLES = ["admin", "moderator", "user"] as const;
type SystemRole = (typeof SYSTEM_ROLES)[number];

export function UsersTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [accountActionUser, setAccountActionUser] = useState<AdminUserRow | null>(null);
  const [accountActionMode, setAccountActionMode] = useState<"deactivate" | "reactivate" | null>(null);
  const [accountActionDialogOpen, setAccountActionDialogOpen] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [postCreateUser, setPostCreateUser] = useState<PostCreateUserRef | null>(null);
  const [postCreateOpen, setPostCreateOpen] = useState(false);

  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [mergeSourceUser, setMergeSourceUser] = useState<AdminUserRow | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  const {
    isDeleting,
    isAccountActioning,
    handleAccountAction,
    isCreating,
    isUpdating,
    isMerging,
    isAddingEmail,
    settingPrimaryEmailId,
    removingEmailId,
    handleToggleJourneyTracking,
    handleToggleRole,
    handleDeleteUser,
    handleCreateUser,
    handleMergeUser,
    handleEditUser,
    handleSetPrimaryEmail,
    handleAddEmail,
    handleRemoveEmail,
  } = useUsersTabActions({
    identityId: identity?.id,
    selectedUser,
    setSelectedUser,
    setDetailOpen,
    editUser,
    setEditUser,
    setEditDialogOpen,
    deleteUser,
    setDeleteUser,
    setDeleteDialogOpen,
    accountActionUser,
    accountActionMode,
    setAccountActionUser,
    setAccountActionMode,
    setAccountActionDialogOpen,
    setCreateDialogOpen,
    setMergeSourceUser,
    setMergeDialogOpen,
    setPostCreateUser,
    setPostCreateOpen,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_admin_users");
      if (error) throw error;
      return ((data ?? []) as AdminUserRow[]).map((row) => ({
        ...row,
        deactivated_at: row.deactivated_at ?? null,
      }));
    },
    staleTime: 30_000,
  });

  // The pane stays open beside the list, so prefer the freshest row over the click-time snapshot.
  const detailUser = useMemo(() => {
    if (!selectedUser) return null;
    return usersData?.find((u) => u.id === selectedUser.id) ?? selectedUser;
  }, [selectedUser, usersData]);

  const newRegistrations = useMemo(() => {
    if (!usersData) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - NEW_REG_DAYS);
    return usersData
      .filter((u) => new Date(u.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [usersData]);

  const filteredData = useMemo(() => {
    let result = usersData ?? [];
    if (debouncedSearch) {
      result = result.filter((u) =>
        matchesSearchFields(debouncedSearch, u.full_name, u.email),
      );
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [usersData, debouncedSearch, roleFilter]);

  const openDetail = useCallback((user: AdminUserRow) => {
    tap();
    setSelectedUser(user);
    setDetailOpen(true);
  }, [tap]);

  const rowActions = useMemo<UsersRowActionHandlers>(() => ({
    onViewDetail: openDetail,
    onViewJourney: (user) => { tap(); go({ to: `/admin/people/${user.id}/journey` }); },
    onToggleJourneyTracking: (user) => { tap(); void handleToggleJourneyTracking(user); },
    onEdit: (user) => { tap(); setEditUser(user); setEditDialogOpen(true); },
    onMerge: (user) => { warning(); setMergeSourceUser(user); setMergeDialogOpen(true); },
    onDeactivate: (user) => {
      warning();
      setAccountActionUser(user);
      setAccountActionMode("deactivate");
      setAccountActionDialogOpen(true);
    },
    onReactivate: (user) => {
      tap();
      setAccountActionUser(user);
      setAccountActionMode("reactivate");
      setAccountActionDialogOpen(true);
    },
    onDelete: (user) => { warning(); setDeleteUser(user); setDeleteDialogOpen(true); },
  }), [go, handleToggleJourneyTracking, openDetail, tap, warning]);

  const columns = useMemo(
    () => createUsersTabColumns({
      tAdmin,
      identityId: identity?.id,
      ...rowActions,
    }),
    [identity?.id, rowActions, tAdmin],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [columnPinning, setColumnPinning] = useState<{ left?: string[]; right?: string[] }>({
    right: ["actions"],
  });

  const reactTable = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnPinning },
    onSortingChange: setSorting,
    onColumnPinningChange: setColumnPinning,
    enableColumnPinning: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: PEOPLE_DEFAULT_PAGE_SIZE } },
  });

  const clearFilters = useCallback(() => { setSearch(""); setRoleFilter("all"); }, []);
  const hasActiveFilters = search !== "" || roleFilter !== "all";
  const isEmptyResult = !isLoading && reactTable.getRowModel().rows.length === 0;
  const visibleUsers = reactTable.getRowModel().rows.map((row) => row.original);
  const { pageIndex, pageSize } = reactTable.getState().pagination;
  const userLabel = tAdmin("common.user");

  const roleFilterContent = (
    <div className="space-y-1.5">
      <Label htmlFor="people-role-filter" className="text-xs text-muted-foreground">
        {tAdmin("common.role")}
      </Label>
      <Select
        value={roleFilter}
        onValueChange={(value) => { tap(); setRoleFilter(value); setFilterOpen(false); }}
      >
        <SelectTrigger id="people-role-filter" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tAdmin("layout.people.allRoles")}</SelectItem>
          {SYSTEM_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {formatSystemRole(role, userLabel)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const master = (
    <div className="flex min-w-0 flex-col gap-3">
      <AdminPageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tAdmin("people.userSearchPlaceholder")}
        filterCount={roleFilter !== "all" ? 1 : 0}
        filterContent={roleFilterContent}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        actions={
          <>
            {!isLoading ? (
              <NewRegistrationsPopover users={newRegistrations} onSelect={openDetail} />
            ) : null}
            <Button size="sm" className="h-10 sm:h-9" onClick={() => { tap(); setCreateDialogOpen(true); }}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {tAdmin("people.createUserSubmit")}
            </Button>
          </>
        }
      />
      <AdminFilterChips
        filters={[
          ...(roleFilter !== "all"
            ? [{ key: "role", label: tAdmin("people.roleFilter", { role: formatSystemRole(roleFilter as SystemRole, userLabel) }), onRemove: () => { tap(); setRoleFilter("all"); } }]
            : []),
        ]}
        onClearAll={() => { tap(); clearFilters(); }}
      />

      {isLoading ? (
        <AdminTableSkeleton rows={7} columns={6} />
      ) : isEmptyResult && hasActiveFilters ? (
        <AdminEmptyState
          icon={<UsersIcon className="h-8 w-8" />}
          title={tAdmin("people.noUsersTitle")}
          description={tAdmin("people.noUsersDescription")}
          action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
          className="min-h-[200px] py-6"
        />
      ) : (
        <>
          <PeopleTable
            table={reactTable}
            offset={roleFilter !== "all" ? "17.75rem" : "15.5rem"}
            getRowId={(user) => user.id}
            emptyLabel={tAdmin("common.noData")}
            selectedId={detailOpen ? detailUser?.id : null}
            onRowClick={openDetail}
          />
          <div className="md:hidden">
            <UsersMobileList
              users={visibleUsers}
              identityId={identity?.id}
              onCardClick={openDetail}
              {...rowActions}
            />
          </div>
        </>
      )}

      {!isLoading && visibleUsers.length > 0 && (
        <PeoplePagination
          page={pageIndex + 1}
          pageCount={reactTable.getPageCount()}
          pageSize={pageSize}
          total={filteredData.length}
          onPageChange={(page) => reactTable.setPageIndex(page - 1)}
          onPageSizeChange={(size) => reactTable.setPageSize(size)}
        />
      )}
    </div>
  );

  return (
    <>
      <AdminMasterDetail
        id="people-users"
        master={master}
        open={detailOpen && !!detailUser}
        onOpenChange={setDetailOpen}
        title={detailUser?.full_name ?? ""}
        description={detailUser ? <span translate="no">{detailUser.email}</span> : undefined}
        footer={
          detailUser ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rowActions.onViewJourney(detailUser)}
              >
                <ActivityIcon className="mr-1.5 h-4 w-4" />
                {tAdmin("people.viewJourney")}
              </Button>
              <Button size="sm" onClick={() => rowActions.onEdit(detailUser)}>
                <PencilIcon className="mr-1.5 h-4 w-4" />
                {tAdmin("common.edit")}
              </Button>
            </>
          ) : undefined
        }
        detail={
          detailUser ? (
            <UserDetailPanel
              user={detailUser}
              onSetPrimaryEmail={(emailId) => { void handleSetPrimaryEmail(detailUser, emailId); }}
              onAddEmail={(email, makePrimary) => handleAddEmail(detailUser, email, makePrimary)}
              onRemoveEmail={(emailId) => { void handleRemoveEmail(detailUser, emailId); }}
              isAddingEmail={isAddingEmail}
              settingPrimaryEmailId={settingPrimaryEmailId}
              removingEmailId={removingEmailId}
              onToggleJourneyTracking={() => { void handleToggleJourneyTracking(detailUser); }}
              onToggleRole={() => handleToggleRole(detailUser)}
              onMerge={() => { setDetailOpen(false); rowActions.onMerge(detailUser); }}
              onDeactivate={() => rowActions.onDeactivate(detailUser)}
              onReactivate={() => rowActions.onReactivate(detailUser)}
              onDelete={() => { setDetailOpen(false); rowActions.onDelete(detailUser); }}
              isSelf={identity?.id === detailUser.id}
            />
          ) : null
        }
      />
      <DeleteConfirmDialog
        title={
          accountActionMode === "reactivate"
            ? tAdmin("people.reactivateAccountTitle")
            : tAdmin("people.deactivateAccountTitle")
        }
        description={
          accountActionMode === "reactivate"
            ? tAdmin("people.reactivateAccountDescription", {
                name: accountActionUser?.full_name ?? "",
              })
            : tAdmin("people.deactivateAccountDescription", {
                name: accountActionUser?.full_name ?? "",
                email: accountActionUser?.email ?? "",
              })
        }
        open={accountActionDialogOpen}
        onOpenChange={(o) => {
          if (!o && !isAccountActioning) {
            setAccountActionDialogOpen(false);
            setAccountActionUser(null);
            setAccountActionMode(null);
          }
        }}
        onConfirm={handleAccountAction}
        isDeleting={isAccountActioning}
        confirmLabel={
          accountActionMode === "reactivate"
            ? tAdmin("people.reactivateAccount")
            : tAdmin("people.deactivateAccount")
        }
        confirmDestructive={accountActionMode !== "reactivate"}
      />
      <DeleteConfirmDialog
        title={tAdmin("people.deleteUserTitle")}
        description={tAdmin("people.deleteUserDescription", { name: deleteUser?.full_name ?? "", email: deleteUser?.email ?? "" })}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteUser(null); } }}
        onConfirm={handleDeleteUser}
        isDeleting={isDeleting}
      />
      <CreateUserDialog key={createDialogOpen ? "create-user-open" : "create-user-closed"} open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={handleCreateUser} isCreating={isCreating} />
      <PostCreateConnectionsDialog
        key={postCreateUser?.id ?? "post-create-empty"}
        open={postCreateOpen}
        onOpenChange={(open) => {
          setPostCreateOpen(open);
          if (!open) setPostCreateUser(null);
        }}
        user={postCreateUser}
        createdBy={identity?.id ?? ""}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "friendships"] });
        }}
      />
      <EditUserDialog
        key={editUser?.id ?? "edit-user-empty"}
        user={editUser}
        open={editDialogOpen}
        onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditUser(null); } }}
        onSubmit={handleEditUser}
        isUpdating={isUpdating}
        isSelf={identity?.id === editUser?.id}
      />
      <MergeUserDialog
        initialSourceUser={mergeSourceUser}
        users={usersData ?? []}
        open={mergeDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isMerging) {
            setMergeDialogOpen(false);
            setMergeSourceUser(null);
          }
        }}
        onConfirm={handleMergeUser}
        isMerging={isMerging}
        identityId={identity?.id}
      />
    </>
  );
}
