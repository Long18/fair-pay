import { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTable } from "@refinedev/react-table";
import { useGetIdentity, useList, type CrudFilters } from "@refinedev/core";
import { useInstantCreate, useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
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
  DropdownMenuSeparator,
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
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  CreditCardIcon,
  MoreHorizontalIcon,
  PlusIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { AdminPageToolbar } from "@/modules/admin/components/AdminPageToolbar";
import { AdminFilterChips } from "@/modules/admin/components/AdminFilterChips";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import type { Profile } from "@/modules/profile/types";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "../../components/AdminMobileCards";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../../i18n";
import { DeleteConfirmDialog } from "./shared-ui";
import { PaymentDetailDialog } from "./payment-detail-dialog";
import { CreatePaymentDialog, EditPaymentDialog } from "./payment-form-dialogs";
import { relationOne } from "./helpers";
import type {
  GroupOption,
  PaymentFormPayload,
  PaymentRecord,
  PaymentRow,
  ProfileOption,
} from "./types";

export function PaymentsTab({ moderatorMode }: { moderatorMode: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();
  const createMutation = useInstantCreate();
  const updateMutation = useInstantUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [senderFilter, setSenderFilter] = useState<string>("all");
  const [receiverFilter, setReceiverFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deletePayment, setDeletePayment] = useState<PaymentRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { tap, success, warning } = useHaptics();

  const { query: groupsQuery } = useList({ resource: "groups", pagination: { pageSize: 200 }, meta: { select: "id, name" } });
  const groups = (groupsQuery.data?.data ?? []) as GroupOption[];

  const { query: profilesQuery } = useList({ resource: "profiles", pagination: { pageSize: 200 }, meta: { select: "id, full_name" } });
  const profiles = (profilesQuery.data?.data ?? []) as ProfileOption[];

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    if (moderatorMode && identity?.id) f.push({ field: "created_by", operator: "eq", value: identity.id });
    if (debouncedSearch) f.push({ field: "note", operator: "contains", value: debouncedSearch });
    if (groupFilter !== "all") f.push({ field: "group_id", operator: "eq", value: groupFilter });
    if (senderFilter !== "all") f.push({ field: "from_user", operator: "eq", value: senderFilter });
    if (receiverFilter !== "all") f.push({ field: "to_user", operator: "eq", value: receiverFilter });
    if (dateFrom) f.push({ field: "payment_date", operator: "gte", value: dateFrom });
    if (dateTo) f.push({ field: "payment_date", operator: "lte", value: dateTo });
    return f;
  }, [debouncedSearch, groupFilter, senderFilter, receiverFilter, dateFrom, dateTo, identity, moderatorMode]);

  const columns = useMemo<ColumnDef<PaymentRow>[]>(() => [
    {
      id: "from_user", header: tAdmin("transactions.payments.sender"), accessorKey: "from_user_name", size: 180, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.from_user_avatar ?? undefined} alt={row.original.from_user_name} />
            <AvatarFallback className="text-xs">{row.original.from_user_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.from_user_name}</span>
        </div>
      ),
    },
    {
      id: "to_user", header: tAdmin("transactions.payments.receiver"), accessorKey: "to_user_name", size: 180, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.to_user_avatar ?? undefined} alt={row.original.to_user_name} />
            <AvatarFallback className="text-xs">{row.original.to_user_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.to_user_name}</span>
        </div>
      ),
    },
    {
      id: "amount", header: () => <div className="text-right">{tAdmin("common.amount")}</div>, accessorKey: "amount", size: 140,
      cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatNumber(row.original.amount)}</div>,
    },
    {
      id: "group", header: tAdmin("transactions.expenses.context"), accessorKey: "group_name", size: 140, enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.group_name ?? row.original.friendship_name ?? tAdmin("context.friends")}</span>,
    },
    {
      id: "payment_date", header: tAdmin("common.date"), accessorKey: "payment_date", size: 110,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "context_type", header: tAdmin("transactions.payments.method"), accessorKey: "context_type", size: 120, enableSorting: false,
      cell: ({ row }) => (
        <Badge className={
          row.original.context_type === "group"
            ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]"
            : "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]"
        }>{row.original.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")}</Badge>
      ),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedPayment(row.original); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditPayment(row.original); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
            {!moderatorMode ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { warning(); setDeletePayment(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [moderatorMode, tap, tAdmin, warning]);

  const table = useTable<PaymentRow>({
    columns,
    refineCoreProps: {
      resource: "payments",
      meta: {
        select: "*, from:profiles!payments_from_user_fkey(full_name, avatar_url), to:profiles!payments_to_user_fkey(full_name, avatar_url), groups(name), friendships(id, user_a, user_b, user_a_profile:profiles!user_a(full_name), user_b_profile:profiles!user_b(full_name))",
      },
      pagination: { pageSize: 10 },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "payment_date", order: "desc" }] },
      syncWithLocation: false,
      queryOptions: {
        select: (data) => {
          const transformed = (data.data as unknown as PaymentRecord[]).map((payment) => {
            const friendship = relationOne(payment.friendships);
            const friendshipUserA = relationOne(friendship?.user_a_profile);
            const friendshipUserB = relationOne(friendship?.user_b_profile);
            return {
              id: payment.id,
              from_user_id: payment.from_user,
              from_user_name: payment.from?.full_name ?? tAdmin("common.unknown"),
              from_user_avatar: payment.from?.avatar_url ?? null,
              to_user_id: payment.to_user,
              to_user_name: payment.to?.full_name ?? tAdmin("common.unknown"),
              to_user_avatar: payment.to?.avatar_url ?? null,
              amount: payment.amount ?? 0,
              currency: payment.currency ?? "VND",
              context_type: payment.context_type,
              group_id: payment.group_id,
              group_name: payment.groups?.name ?? null,
              friendship_id: payment.friendship_id ?? null,
              friendship_name: friendship
                ? `${friendshipUserA?.full_name ?? tAdmin("people.userA")} - ${friendshipUserB?.full_name ?? tAdmin("people.userB")}`
                : null,
              payment_date: payment.payment_date,
              note: payment.note,
              created_at: payment.created_at,
            };
          });
          return { ...data, data: transformed };
        },
      },
    },
  });

  const handleDelete = useCallback(() => {
    if (!deletePayment) return;
    warning();
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "payments", id: deletePayment.id },
      {
        onSuccess: () => { toast.success(tAdmin("transactions.payments.deleted", { amount: formatNumber(deletePayment.amount), currency: deletePayment.currency })); setDeleteDialogOpen(false); setDeletePayment(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsDeleting(false); },
      },
    );
  }, [deletePayment, deleteMutation, table.refineCore.tableQuery, tAdmin, warning]);

  const handleCreate = useCallback((data: PaymentFormPayload) => {
    if (!identity?.id) {
      toast.error(tAdmin("common.errorWithMessage", { message: "Missing admin identity" }));
      return;
    }
    setIsCreating(true);
    createMutation.mutate(
      {
        resource: "payments",
        values: {
          context_type: data.context_type,
          group_id: data.group_id,
          friendship_id: data.friendship_id,
          from_user: data.from_user,
          to_user: data.to_user,
          amount: data.amount,
          currency: data.currency,
          payment_date: data.payment_date,
          note: data.note || null,
          created_by: identity.id,
        },
      },
      {
        onSuccess: () => { success(); toast.success(tAdmin("transactions.payments.created")); setCreateDialogOpen(false); setIsCreating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsCreating(false); },
      },
    );
  }, [createMutation, identity, table.refineCore.tableQuery, success, tAdmin]);

  const handleEdit = useCallback((data: PaymentFormPayload) => {
    if (!editPayment) return;
    setIsUpdating(true);
    updateMutation.mutate(
      {
        resource: "payments",
        id: editPayment.id,
        values: {
          context_type: data.context_type,
          group_id: data.group_id,
          friendship_id: data.friendship_id,
          from_user: data.from_user,
          to_user: data.to_user,
          amount: data.amount,
          currency: data.currency,
          payment_date: data.payment_date,
          note: data.note || null,
        },
      },
      {
        onSuccess: () => { success(); toast.success(tAdmin("transactions.payments.updated")); setEditDialogOpen(false); setEditPayment(null); setIsUpdating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsUpdating(false); },
      },
    );
  }, [editPayment, updateMutation, table.refineCore.tableQuery, success, tAdmin]);

  const clearFilters = useCallback(() => { tap(); setSearch(""); setGroupFilter("all"); setSenderFilter("all"); setReceiverFilter("all"); setDateFrom(""); setDateTo(""); }, [tap]);
  const hasActiveFilters = search !== "" || groupFilter !== "all" || senderFilter !== "all" || receiverFilter !== "all" || dateFrom !== "" || dateTo !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visiblePayments = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div><CardTitle>{tAdmin("transactions.payments.cardTitle")}</CardTitle><CardDescription>{tAdmin("transactions.payments.cardDescription")}</CardDescription></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPageToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tAdmin("transactions.payments.searchPlaceholder")}
            filterCount={[groupFilter !== "all", senderFilter !== "all", receiverFilter !== "all", dateFrom !== "", dateTo !== ""].filter(Boolean).length}
            onFilterToggle={() => setShowFilters((v) => !v)}
            actions={
              <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {tAdmin("transactions.payments.create")}
              </Button>
            }
          />
          <AdminFilterChips
            filters={[
              ...(groupFilter !== "all" ? [{ key: "group", label: tAdmin("transactions.filterChips.group", { value: groups.find((g) => g.id === groupFilter)?.name ?? groupFilter }), onRemove: () => { tap(); setGroupFilter("all"); } }] : []),
              ...(senderFilter !== "all" ? [{ key: "sender", label: tAdmin("transactions.filterChips.sender", { value: profiles.find((p) => p.id === senderFilter)?.full_name ?? senderFilter }), onRemove: () => { tap(); setSenderFilter("all"); } }] : []),
              ...(receiverFilter !== "all" ? [{ key: "receiver", label: tAdmin("transactions.filterChips.receiver", { value: profiles.find((p) => p.id === receiverFilter)?.full_name ?? receiverFilter }), onRemove: () => { tap(); setReceiverFilter("all"); } }] : []),
              ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => setDateFrom("") }] : []),
              ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => setDateTo("") }] : []),
            ]}
            onClearAll={clearFilters}
          />
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-2">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("common.group")}</Label>
                  <Select value={groupFilter} onValueChange={(v) => { tap(); setGroupFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("transactions.expenses.allGroups")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("transactions.expenses.allGroups")}</SelectItem>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("transactions.payments.sender")}</Label>
                  <Select value={senderFilter} onValueChange={(v) => { tap(); setSenderFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("common.all")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("common.all")}</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">{tAdmin("transactions.payments.receiver")}</Label>
                  <Select value={receiverFilter} onValueChange={(v) => { tap(); setReceiverFilter(v); }}><SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin("common.all")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{tAdmin("common.all")}</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]"><EmptyMedia variant="icon"><CreditCardIcon className="h-6 w-6" /></EmptyMedia><EmptyHeader><EmptyTitle>{tAdmin("transactions.payments.noResultsTitle")}</EmptyTitle><EmptyDescription>{tAdmin("transactions.payments.noResultsDescription")}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={clearFilters}>{tAdmin("common.clearFilters")}</Button></EmptyContent></Empty>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={visiblePayments}
                  getKey={(payment) => payment.id}
                  renderItem={(payment) => (
                    <AdminMobileCard
                      title={`${payment.from_user_name} -> ${payment.to_user_name}`}
                      description={formatDate(payment.payment_date)}
                      leading={<CreditCardIcon className="mt-1 h-5 w-5 text-primary" />}
                      badges={
                        <Badge className={payment.context_type === "group"
                          ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]"
                          : "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]"
                        }>
                          {payment.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")}
                        </Badge>
                      }
                      meta={[
                        { label: tAdmin("common.amount"), value: <span className="font-mono tabular-nums">{formatNumber(payment.amount)} {payment.currency}</span> },
                        { label: tAdmin("transactions.expenses.context"), value: payment.group_name ?? payment.friendship_name ?? tAdmin("context.friends") },
                        { label: tAdmin("transactions.payments.note"), value: payment.note || "—" },
                        { label: "ID", value: <span className="font-mono text-xs">{payment.id.slice(0, 8)}</span> },
                      ]}
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer"><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { tap(); setSelectedPayment(payment); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { tap(); setEditPayment(payment); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
                            {!moderatorMode ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { warning(); setDeletePayment(payment); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                      onClick={() => { tap(); setSelectedPayment(payment); setDetailOpen(true); }}
                      ariaLabel={`${payment.from_user_name} ${payment.to_user_name}`}
                    />
                  )}
                />
                {visiblePayments.length > 0 && (
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

      <PaymentDetailDialog payment={selectedPayment} open={detailOpen} onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); setEditPayment(selectedPayment); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeletePayment(selectedPayment); setDeleteDialogOpen(true); }}
        canDelete={!moderatorMode}
      />
      {!moderatorMode ? <DeleteConfirmDialog title={tAdmin("transactions.payments.deleteTitle")} description={tAdmin("transactions.payments.deleteDescription", { amount: formatNumber(deletePayment?.amount ?? 0), currency: deletePayment?.currency ?? "VND", from: deletePayment?.from_user_name ?? "", to: deletePayment?.to_user_name ?? "" })}
        open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeletePayment(null); } }} onConfirm={handleDelete} isDeleting={isDeleting}
      /> : null}
      <CreatePaymentDialog key={createDialogOpen ? "create-payment-open" : "create-payment-closed"} open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={handleCreate} isCreating={isCreating} />
      <EditPaymentDialog key={editPayment?.id ?? "edit-payment-empty"} payment={editPayment} open={editDialogOpen} onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditPayment(null); } }} onSubmit={handleEdit} isUpdating={isUpdating} />
    </>
  );
}
