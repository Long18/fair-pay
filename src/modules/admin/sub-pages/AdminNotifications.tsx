import { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { useInstantDelete, useInstantCreate, useInstantUpdate } from "@/hooks/use-instant-mutation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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
  BellIcon,
  FilterIcon,
  PlusIcon,
} from "@/components/ui/icons";
import {
  AdminMobileCard,
  AdminMobileCards,
} from "../components/AdminMobileCards";
import { formatDate } from "@/lib/locale-utils";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../i18n";
import { TypeBadge, ReadStatusBadge } from "./admin-notifications/badges";
import { NOTIFICATION_TYPES } from "./admin-notifications/constants";
import {
  CreateNotificationDialog,
  DeleteNotificationDialog,
  EditNotificationDialog,
} from "./admin-notifications/dialogs";
import { RowActions } from "./admin-notifications/row-actions";
import type { NotificationRow, NotificationRecord } from "./admin-notifications/types";

export function AdminNotifications() {
  const deleteMutation = useInstantDelete();
  const createMutation = useInstantCreate();
  const updateMutation = useInstantUpdate();
  const { tap, success, warning } = useHaptics();
  const { tAdmin } = useAdminTranslation();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [deleteNotification, setDeleteNotification] = useState<NotificationRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const [editNotification, setEditNotification] = useState<NotificationRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    if (debouncedSearch) {
      f.push({ field: "message", operator: "contains", value: debouncedSearch });
    }
    if (typeFilter !== "all") {
      f.push({ field: "type", operator: "eq", value: typeFilter });
    }
    if (readFilter !== "all") {
      f.push({ field: "is_read", operator: "eq", value: readFilter === "read" });
    }
    if (dateFrom) {
      f.push({ field: "created_at", operator: "gte", value: dateFrom });
    }
    if (dateTo) {
      f.push({ field: "created_at", operator: "lte", value: dateTo + "T23:59:59" });
    }
    return f;
  }, [debouncedSearch, typeFilter, readFilter, dateFrom, dateTo]);

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
        size: 250,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm truncate block max-w-[250px]" title={getValue() as string}>
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
        size: 50,
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
      pagination: { pageSize: 10 },
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

  const clearFilters = useCallback(() => {
    tap();
    setSearch("");
    setTypeFilter("all");
    setReadFilter("all");
    setDateFrom("");
    setDateTo("");
  }, [tap]);

  const hasActiveFilters =
    search !== "" ||
    typeFilter !== "all" ||
    readFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

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
  }, [deleteNotification, deleteMutation, table.refineCore.tableQuery, warning, tAdmin]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{tAdmin("notifications.title")}</CardTitle>
            <CardDescription>
              {tAdmin("notifications.description")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => { tap(); setShowFilters((v) => !v); }}
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              {tAdmin("common.filter")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tAdmin("notifications.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tAdmin("notifications.notificationType")}</label>
                  <Select value={typeFilter} onValueChange={(v) => { tap(); setTypeFilter(v); }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={tAdmin("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tAdmin("common.all")}</SelectItem>
                      {NOTIFICATION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {tAdmin(`notifications.types.${t}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tAdmin("common.status")}</label>
                  <Select value={readFilter} onValueChange={(v) => { tap(); setReadFilter(v); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={tAdmin("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tAdmin("common.all")}</SelectItem>
                      <SelectItem value="read">{tAdmin("status.read")}</SelectItem>
                      <SelectItem value="unread">{tAdmin("status.unread")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[150px]"
                  />
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {tAdmin("common.clearFilters")}
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {isEmptyResult ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <BellIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{tAdmin("notifications.noResultsTitle")}</EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? tAdmin("notifications.noResultsFiltered")
                    : tAdmin("notifications.noResultsEmpty")}
                </EmptyDescription>
              </EmptyHeader>
              {hasActiveFilters && (
                <EmptyContent>
                  <Button variant="outline" onClick={clearFilters}>
                    {tAdmin("common.clearFilters")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={table.reactTable.getRowModel().rows.map((row) => row.original)}
                  getKey={(notification) => notification.id}
                  renderItem={(notification) => (
                    <AdminMobileCard
                      title={notification.title || notification.message}
                      description={notification.user_name}
                      leading={
                        <UserAvatar
                          user={{
                            full_name: notification.user_name,
                            avatar_url: notification.user_avatar,
                          }}
                          size="md"
                        />
                      }
                      badges={
                        <>
                          <TypeBadge type={notification.type} />
                          <ReadStatusBadge isRead={notification.is_read} />
                        </>
                      }
                      meta={[
                        {
                          label: tAdmin("common.createdAt"),
                          value: formatDate(notification.created_at),
                        },
                      ]}
                      actions={
                        <RowActions
                          onEdit={() => {
                            setEditNotification(notification);
                            setEditDialogOpen(true);
                          }}
                          onDelete={() => {
                            setDeleteNotification(notification);
                            setDeleteDialogOpen(true);
                          }}
                        />
                      }
                    />
                  )}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
