import { useMemo, useState, useCallback } from "react";
import { useTable } from "@refinedev/react-table";
import { useInstantDelete, useInstantCreate, useInstantUpdate } from "@/hooks/use-instant-mutation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { PlusIcon } from "@/components/ui/icons";
import { AdminPageToolbar } from "../components/AdminPageToolbar";
import { AdminFilterChips } from "../components/AdminFilterChips";
import { AdminMasterDetail } from "../components/AdminMasterDetail";
import { formatDate } from "@/lib/locale-utils";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../i18n";
import { FilterPopoverForm } from "../pages/admin-transactions/filter-form";
import { RefineDataGrid, RefineDataGridPager } from "../pages/admin-transactions/refine-data-grid";
import { DEFAULT_PAGE_SIZE, tableOffset } from "../pages/admin-transactions/grid-config";
import { TypeBadge, ReadStatusBadge } from "./admin-notifications/badges";
import {
  CreateNotificationDialog,
  DeleteNotificationDialog,
  EditNotificationDialog,
} from "./admin-notifications/dialogs";
import {
  NotificationDetailFooter,
  NotificationDetailPanel,
} from "./admin-notifications/notification-detail-panel";
import {
  NotificationMobileList,
  NotificationsEmptyState,
} from "./admin-notifications/notification-list-parts";
import { RowActions } from "./admin-notifications/row-actions";
import type { NotificationRow, NotificationRecord } from "./admin-notifications/types";
import { useNotificationFilters } from "./admin-notifications/use-notification-filters";

export function AdminNotifications() {
  const deleteMutation = useInstantDelete();
  const createMutation = useInstantCreate();
  const updateMutation = useInstantUpdate();
  const { tap, success, warning } = useHaptics();
  const { tAdmin } = useAdminTranslation();

  const {
    search,
    setSearch,
    showFilters,
    setShowFilters,
    filters,
    filterChips,
    filterFields,
    clearFilters,
    hasActiveFilters,
  } = useNotificationFilters();

  const [deleteNotification, setDeleteNotification] = useState<NotificationRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const [editNotification, setEditNotification] = useState<NotificationRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = useCallback((notification: NotificationRow) => {
    tap();
    setSelectedNotification(notification);
    setDetailOpen(true);
  }, [tap]);

  const columns = useMemo<ColumnDef<NotificationRow>[]>(
    () => [
      {
        id: "recipient",
        header: tAdmin("notifications.recipient"),
        accessorKey: "user_name",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              user={{
                full_name: row.original.user_name,
                avatar_url: row.original.user_avatar,
              }}
              size="sm"
            />
            <span className="text-sm truncate">{row.original.user_name}</span>
            <UserGroupStack userId={row.original.user_id} size="xs" />
          </div>
        ),
      },
      {
        id: "type",
        header: tAdmin("notifications.notificationType"),
        accessorKey: "type",
        size: 160,
        enableSorting: false,
        cell: ({ getValue }) => <TypeBadge type={getValue() as string} />,
      },
      {
        id: "message",
        header: tAdmin("common.content"),
        accessorKey: "message",
        size: 280,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="block truncate text-sm" title={getValue() as string}>
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "is_read",
        header: tAdmin("common.status"),
        accessorKey: "is_read",
        size: 120,
        enableSorting: false,
        cell: ({ getValue }) => <ReadStatusBadge isRead={getValue() as boolean} />,
      },
      {
        id: "created_at",
        header: tAdmin("common.createdAt"),
        accessorKey: "created_at",
        size: 120,
        cell: ({ getValue }) => formatDate(getValue() as string),
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            onEdit={() => {
              setEditNotification(row.original);
              setEditDialogOpen(true);
            }}
            onDelete={() => {
              setDeleteNotification(row.original);
              setDeleteDialogOpen(true);
            }}
          />
        ),
      },
    ],
    [tAdmin],
  );

  const table = useTable<NotificationRow>({
    columns,
    refineCoreProps: {
      resource: "notifications",
      meta: {
        select: "*, profiles!notifications_user_id_fkey(full_name, avatar_url)",
      },
      pagination: { pageSize: DEFAULT_PAGE_SIZE },
      filters: {
        permanent: filters,
      },
      sorters: {
        initial: [{ field: "created_at", order: "desc" }],
      },
      syncWithLocation: false,
      queryOptions: {
        select: (data) => {
          const transformed = (data.data as NotificationRecord[]).map((n) => ({
            id: n.id,
            user_id: n.user_id,
            user_name: n.profiles?.full_name ?? tAdmin("common.unknown"),
            user_avatar: n.profiles?.avatar_url ?? null,
            type: n.type,
            title: n.title ?? "",
            message: n.message ?? "",
            is_read: n.is_read ?? false,
            created_at: n.created_at,
          }));
          return { ...data, data: transformed };
        },
      },
    },
  });

  const isEmptyResult =
    !table.refineCore.tableQuery.isLoading &&
    table.reactTable.getRowModel().rows.length === 0;

  const handleDelete = useCallback(() => {
    if (!deleteNotification) return;
    warning();
    setIsDeleting(true);
    deleteMutation.mutate(
      {
        resource: "notifications",
        id: deleteNotification.id,
      },
      {
        onSuccess: () => {
          toast.success(tAdmin("notifications.deleted"));
          if (selectedNotification?.id === deleteNotification.id) setDetailOpen(false);
          setDeleteDialogOpen(false);
          setDeleteNotification(null);
          setIsDeleting(false);
          table.refineCore.tableQuery.refetch();
        },
        onError: (error) => {
          toast.error(tAdmin("common.errorWithMessage", { message: error.message }));
          setIsDeleting(false);
        },
      },
    );
  }, [deleteNotification, deleteMutation, selectedNotification, table.refineCore.tableQuery, warning, tAdmin]);

  const handleCreate = useCallback(
    (data: { user_id: string; type: string; title: string; message: string }) => {
      setIsCreating(true);
      createMutation.mutate(
        {
          resource: "notifications",
          values: {
            user_id: data.user_id,
            type: data.type,
            title: data.title,
            message: data.message,
            is_read: false,
          },
        },
        {
          onSuccess: () => {
            success();
            toast.success(tAdmin("notifications.created"));
            setCreateDialogOpen(false);
            setIsCreating(false);
            table.refineCore.tableQuery.refetch();
          },
          onError: (error) => {
            toast.error(tAdmin("common.errorWithMessage", { message: error.message }));
            setIsCreating(false);
          },
        },
      );
    },
    [createMutation, table.refineCore.tableQuery, success, tAdmin],
  );

  const handleEdit = useCallback(
    (data: { type: string; title: string; message: string }) => {
      if (!editNotification) return;
      setIsUpdating(true);
      updateMutation.mutate(
        {
          resource: "notifications",
          id: editNotification.id,
          values: {
            type: data.type,
            title: data.title,
            message: data.message,
          },
        },
        {
          onSuccess: () => {
            success();
            toast.success(tAdmin("notifications.updated"));
            setEditDialogOpen(false);
            setEditNotification(null);
            setIsUpdating(false);
            table.refineCore.tableQuery.refetch();
          },
          onError: (error) => {
            toast.error(tAdmin("common.errorWithMessage", { message: error.message }));
            setIsUpdating(false);
          },
        },
      );
    },
    [editNotification, updateMutation, table.refineCore.tableQuery, success, tAdmin],
  );

  const visibleNotifications = table.reactTable.getRowModel().rows.map((row) => row.original);
  const isDetailVisible = detailOpen && selectedNotification !== null;
  const openEdit = (notification: NotificationRow) => {
    setEditNotification(notification);
    setEditDialogOpen(true);
  };
  const openDelete = (notification: NotificationRow) => {
    setDeleteNotification(notification);
    setDeleteDialogOpen(true);
  };

  const master = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AdminPageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tAdmin("notifications.searchPlaceholder")}
        filterCount={filterChips.length}
        filterOpen={showFilters}
        onFilterOpenChange={setShowFilters}
        filterContent={
          <FilterPopoverForm
            fields={filterFields}
            onClear={clearFilters}
            onDone={() => setShowFilters(false)}
            canClear={hasActiveFilters}
          />
        }
        actions={
          <Button
            size="sm"
            onClick={() => {
              tap();
              setCreateFormKey((k) => k + 1);
              setCreateDialogOpen(true);
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {tAdmin("notifications.create")}
          </Button>
        }
      />
      <AdminFilterChips filters={filterChips} onClearAll={clearFilters} />

      {isEmptyResult ? (
        <NotificationsEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
      ) : (
        <>
          <div className="hidden min-h-0 flex-col gap-2 md:flex">
            <RefineDataGrid
              table={table}
              selectedId={isDetailVisible ? selectedNotification.id : null}
              onRowClick={openDetail}
              offset={tableOffset(filterChips.length > 0)}
            />
            {visibleNotifications.length > 0 ? <RefineDataGridPager table={table} /> : null}
          </div>
          <NotificationMobileList
            items={visibleNotifications}
            currentPage={table.refineCore.currentPage}
            pageCount={table.refineCore.pageCount}
            onPageChange={table.refineCore.setCurrentPage}
            onOpen={openDetail}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        </>
      )}
    </div>
  );

  return (
    <>
        <AdminMasterDetail
          id="tx-notifications"
          open={isDetailVisible}
          onOpenChange={setDetailOpen}
          size="md"
          title={selectedNotification?.title || tAdmin("layout.transactions.notificationDetailTitle")}
          description={selectedNotification ? formatDate(selectedNotification.created_at) : undefined}
          footer={selectedNotification ? (
            <NotificationDetailFooter
              onEdit={() => { setDetailOpen(false); openEdit(selectedNotification); }}
              onDelete={() => openDelete(selectedNotification)}
            />
          ) : undefined}
          master={master}
          detail={selectedNotification ? <NotificationDetailPanel notification={selectedNotification} /> : null}
        />

      <DeleteNotificationDialog
        notification={deleteNotification}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteDialogOpen(false);
            setDeleteNotification(null);
          }
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <CreateNotificationDialog
        key={createFormKey}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isCreating={isCreating}
      />

      <EditNotificationDialog
        notification={editNotification}
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isUpdating) {
            setEditDialogOpen(false);
            setEditNotification(null);
          }
        }}
        onSubmit={handleEdit}
        isUpdating={isUpdating}
      />
    </>
  );
}
