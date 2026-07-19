import { useMemo, useState, useCallback, useEffect, useRef } from "react";
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
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { supabaseClient } from "@/utility/supabaseClient";
import { getCommonStyles } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UsersIcon,
  UserPlusIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { matchesSearchFields } from "@/lib/search-utils";
import type { Profile } from "@/modules/profile/types";
import type { AdminUserRow } from "../../types";
import { AdminPageToolbar } from "../../components/AdminPageToolbar";
import { AdminFilterChips } from "../../components/AdminFilterChips";
import { AdminTableSkeleton } from "../../components/AdminTableSkeleton";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import {
  PostCreateConnectionsDialog,
  type PostCreateUserRef,
} from "../../components/PostCreateConnectionsDialog";
import { AdminMobilePagination } from "../../components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import { formatSystemRole } from "./utils";
import { UserDetailDialog } from "./user-detail-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { MergeUserDialog } from "./merge-user-dialog";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { NewRegistrationCard } from "./new-registration-card";
import { createUsersTabColumns, NEW_REG_DAYS } from "./users-tab-columns";
import { UsersMobileList } from "./users-mobile-list";
import { useUsersTabActions } from "./use-users-tab-actions";
import type { UsersRowActionHandlers } from "./users-row-actions";

export function UsersTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [postCreateUser, setPostCreateUser] = useState<PostCreateUserRef | null>(null);
  const [postCreateOpen, setPostCreateOpen] = useState(false);

  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [mergeSourceUser, setMergeSourceUser] = useState<AdminUserRow | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  const {
    isDeleting,
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
      return (data ?? []) as AdminUserRow[];
    },
    staleTime: 30_000,
  });

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

  const rowActions = useMemo<UsersRowActionHandlers>(() => ({
    onViewDetail: (user) => { tap(); setSelectedUser(user); setDetailOpen(true); },
    onViewJourney: (user) => { tap(); go({ to: `/admin/people/${user.id}/journey` }); },
    onToggleJourneyTracking: (user) => { tap(); void handleToggleJourneyTracking(user); },
    onEdit: (user) => { tap(); setEditUser(user); setEditDialogOpen(true); },
    onMerge: (user) => { warning(); setMergeSourceUser(user); setMergeDialogOpen(true); },
    onDelete: (user) => { warning(); setDeleteUser(user); setDeleteDialogOpen(true); },
  }), [go, handleToggleJourneyTracking, tap, warning]);

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
  const usersScrollRef = useRef<HTMLDivElement>(null);
  const [usersTableOverflow, setUsersTableOverflow] = useState({
    horizontal: false,
    vertical: false,
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
    initialState: { pagination: { pageSize: 10 } },
  });

  useEffect(() => {
    const checkOverflow = () => {
      const container = usersScrollRef.current;
      const tableEl = container?.querySelector("table");
      if (!tableEl || !container) return;
      setUsersTableOverflow({
        horizontal: tableEl.offsetWidth > container.clientWidth,
        vertical: tableEl.offsetHeight > container.clientHeight,
      });
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    const timeoutId = setTimeout(checkOverflow, 100);
    return () => {
      window.removeEventListener("resize", checkOverflow);
      clearTimeout(timeoutId);
    };
  }, [filteredData]);

  const clearFilters = useCallback(() => { setSearch(""); setRoleFilter("all"); }, []);
  const hasActiveFilters = search !== "" || roleFilter !== "all";
  const isEmptyResult = !isLoading && reactTable.getRowModel().rows.length === 0;
  const visibleUsers = reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>
      <div className="space-y-4">
        {!isLoading && newRegistrations.length > 0 && (
          <Collapsible defaultOpen>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger className="flex w-full items-center justify-between [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-center gap-2">
                    <UserPlusIcon className="h-4 w-4 text-[var(--status-success-foreground)]" />
                    <CardTitle className="text-base">{tAdmin("people.newRegistrationsTitle")}</CardTitle>
                    <Badge variant="secondary" className="bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] text-xs">
                      {newRegistrations.length}
                    </Badge>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                </CollapsibleTrigger>
                <CardDescription>{tAdmin("people.newRegistrationsDescription", { days: NEW_REG_DAYS })}</CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <AnimatedList items={newRegistrations}>
                    {newRegistrations.map((user, index) => (
                      <AnimatedRow key={user.id} index={index}>
                        <NewRegistrationCard
                          user={user}
                          onViewDetail={() => {
                            setSelectedUser(user);
                            setDetailOpen(true);
                          }}
                        />
                      </AnimatedRow>
                    ))}
                  </AnimatedList>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{tAdmin("people.usersCardTitle")}</CardTitle>
              <CardDescription>{tAdmin("people.usersCardDescription")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminPageToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={tAdmin("people.userSearchPlaceholder")}
              filterCount={roleFilter !== "all" ? 1 : 0}
              onFilterToggle={() => {}}
              actions={
                <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {tAdmin("people.createUserSubmit")}
                </Button>
              }
            />
            <AdminFilterChips
              filters={[
                ...(roleFilter !== "all"
                  ? [{ key: "role", label: tAdmin("people.roleFilter", { role: formatSystemRole(roleFilter as "admin" | "moderator" | "user", tAdmin("common.user")) }), onRemove: () => { tap(); setRoleFilter("all"); } }]
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
              />
            ) : (
              <>
                <div ref={usersScrollRef} className="hidden overflow-x-auto rounded-md border md:block">
                  <Table containerClassName="overflow-visible" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
                    <TableHeader>
                      {reactTable.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              style={getCommonStyles({
                                column: header.column,
                                isOverflowing: usersTableOverflow,
                              })}
                            >
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {reactTable.getRowModel().rows.length ? (
                        reactTable.getRowModel().rows.map((row) => (
                          <TableRow key={row.original?.id ?? row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                style={getCommonStyles({
                                  column: cell.column,
                                  isOverflowing: usersTableOverflow,
                                })}
                              >
                                <div className="truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">{tAdmin("common.noData")}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <UsersMobileList
                    users={visibleUsers}
                    identityId={identity?.id}
                    onCardClick={(user) => { tap(); setSelectedUser(user); setDetailOpen(true); }}
                    {...rowActions}
                  />
                </div>
              </>
            )}

            {!isLoading && reactTable.getRowModel().rows.length > 0 && (
              <div className="hidden items-center justify-between md:flex">
                <p className="text-sm text-muted-foreground">{tAdmin("common.pageCount", { page: reactTable.getState().pagination.pageIndex + 1, total: reactTable.getPageCount() })}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => reactTable.previousPage()} disabled={!reactTable.getCanPreviousPage()}>{tAdmin("common.previous")}</Button>
                  <Button variant="outline" size="sm" onClick={() => reactTable.nextPage()} disabled={!reactTable.getCanNextPage()}>{tAdmin("common.next")}</Button>
                </div>
              </div>
            )}
            {!isLoading && reactTable.getRowModel().rows.length > 0 && (
              <div className="md:hidden">
                <AdminMobilePagination
                  summary={tAdmin("common.pageCount", { page: reactTable.getState().pagination.pageIndex + 1, total: reactTable.getPageCount() })}
                  previousLabel={tAdmin("common.previous")}
                  nextLabel={tAdmin("common.next")}
                  canPrevious={reactTable.getCanPreviousPage()}
                  canNext={reactTable.getCanNextPage()}
                  onPrevious={() => reactTable.previousPage()}
                  onNext={() => reactTable.nextPage()}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailDialog
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onViewJourney={() => {
          if (!selectedUser) return;
          tap();
          setDetailOpen(false);
          go({ to: `/admin/people/${selectedUser.id}/journey` });
        }}
        onSetPrimaryEmail={(emailId) => {
          if (selectedUser) void handleSetPrimaryEmail(selectedUser, emailId);
        }}
        onAddEmail={(email, makePrimary) => {
          if (!selectedUser) return Promise.resolve();
          return handleAddEmail(selectedUser, email, makePrimary);
        }}
        onRemoveEmail={(emailId) => {
          if (!selectedUser) return;
          void handleRemoveEmail(selectedUser, emailId);
        }}
        isAddingEmail={isAddingEmail}
        settingPrimaryEmailId={settingPrimaryEmailId}
        removingEmailId={removingEmailId}
        onToggleJourneyTracking={() => {
          if (!selectedUser) return;
          void handleToggleJourneyTracking(selectedUser);
        }}
        onEdit={() => { setDetailOpen(false); setEditUser(selectedUser); setEditDialogOpen(true); }}
        onToggleRole={() => { if (selectedUser) handleToggleRole(selectedUser); }}
        onMerge={() => {
          if (!selectedUser) return;
          warning();
          setDetailOpen(false);
          setMergeSourceUser(selectedUser);
          setMergeDialogOpen(true);
        }}
        onDelete={() => { setDetailOpen(false); setDeleteUser(selectedUser); setDeleteDialogOpen(true); }}
        isSelf={identity?.id === selectedUser?.id}
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
