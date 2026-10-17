import { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTable } from "@refinedev/react-table";
import { useGetIdentity, useList, type CrudFilters } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  ReceiptIcon,
  MoreHorizontalIcon,
  PlusIcon,
  PencilIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "@/components/ui/icons";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { AdminPageToolbar } from "@/modules/admin/components/AdminPageToolbar";
import { AdminFilterChips } from "@/modules/admin/components/AdminFilterChips";
import { AdminMasterDetail } from "@/modules/admin/components/AdminMasterDetail";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import type { Profile } from "@/modules/profile/types";
import { AdminCreateExpenseDialog } from "../../components/AdminCreateExpenseDialog";
import { AdminEditExpenseDialog } from "../../components/AdminEditExpenseDialog";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "../../components/AdminMobileCards";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../../i18n";
import { DeleteConfirmDialog } from "./shared-ui";
import { ExpenseDetailFooter, ExpenseDetailPanel } from "./expense-detail-panel";
import { FilterPopoverForm, type FilterField } from "./filter-form";
import { RefineDataGrid, RefineDataGridPager } from "./refine-data-grid";
import { DEFAULT_PAGE_SIZE, tableOffset } from "./grid-config";
import { getErrorMessage } from "./helpers";
import type { ExpenseRecord, ExpenseRow, GroupOption } from "./types";

export function ExpensesTab({ moderatorMode }: { moderatorMode: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { tap, warning } = useHaptics();

  const { query: groupsQuery } = useList({ resource: "groups", pagination: { pageSize: 200 }, meta: { select: "id, name" } });
  const groups = (groupsQuery.data?.data ?? []) as GroupOption[];

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    f.push({ field: "is_payment", operator: "eq", value: false });
    if (moderatorMode && identity?.id) f.push({ field: "created_by", operator: "eq", value: identity.id });
    if (debouncedSearch) f.push({ field: "description", operator: "contains", value: debouncedSearch });
    if (groupFilter !== "all") f.push({ field: "group_id", operator: "eq", value: groupFilter });
    if (dateFrom) f.push({ field: "expense_date", operator: "gte", value: dateFrom });
    if (dateTo) f.push({ field: "expense_date", operator: "lte", value: dateTo });
    if (amountMin) f.push({ field: "amount", operator: "gte", value: Number(amountMin) });
    if (amountMax) f.push({ field: "amount", operator: "lte", value: Number(amountMax) });
    return f;
  }, [debouncedSearch, groupFilter, dateFrom, dateTo, amountMin, amountMax, identity, moderatorMode]);

  const openDetail = useCallback((expense: ExpenseRow) => {
    tap();
    setSelectedExpense(expense);
    setDetailOpen(true);
  }, [tap]);

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(() => [
    { id: "description", header: tAdmin("transactions.expenses.description"), accessorKey: "description", size: 200 },
    {
      id: "category", header: tAdmin("transactions.expenses.category"), accessorKey: "category", size: 120, enableSorting: false,
      cell: ({ row }) => {
        const cat = getCategoryMeta(row.original.category);
        const CatIcon = cat.icon;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center justify-center h-5 w-5 rounded ${cat.bgColor}`}>
              <CatIcon size={12} className={cat.color} />
            </span>
            <span className="text-sm">{cat.name}</span>
          </div>
        );
      },
    },
    {
      id: "amount", header: () => <div className="text-right">{tAdmin("common.amount")}</div>, accessorKey: "amount", size: 130,
      cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatNumber(row.original.amount)}</div>,
    },
    {
      id: "paid_by", header: tAdmin("transactions.expenses.payer"), accessorKey: "paid_by_name", size: 200, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            user={{
              full_name: row.original.paid_by_name,
              avatar_url: row.original.paid_by_avatar,
            }}
            size="sm"
          />
          <span className="text-sm truncate">{row.original.paid_by_name}</span>
          <UserGroupStack userId={row.original.paid_by_user_id} size="xs" />
        </div>
      ),
    },
    {
      id: "group", header: tAdmin("transactions.expenses.context"), accessorKey: "group_name", size: 140, enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.group_name ?? tAdmin("context.friends")}</span>,
    },
    { id: "expense_date", header: tAdmin("transactions.expenses.date"), accessorKey: "expense_date", size: 110, cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: "status", header: tAdmin("common.status"), accessorKey: "is_settled", size: 120, enableSorting: false,
      cell: ({ row }) => row.original.is_settled
        ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.settled")}</Badge>
        : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.pending")}</Badge>,
    },
    {
      id: "actions", header: "", size: 48, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={tAdmin("common.actions")}><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDetail(row.original)}>{tAdmin("common.details")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditExpenseId(row.original.id); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
            {!moderatorMode ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { warning(); setDeleteExpense(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [moderatorMode, openDetail, tap, tAdmin, warning]);

  const table = useTable<ExpenseRow>({
    columns,
    refineCoreProps: {
      resource: "expenses",
      meta: { select: "*, profiles!expenses_paid_by_user_id_fkey(full_name, avatar_url), groups(name), expense_splits(is_settled)" },
      pagination: { pageSize: DEFAULT_PAGE_SIZE },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "expense_date", order: "desc" }] },
      syncWithLocation: false,
      queryOptions: {
        select: (data) => {
          const transformed = (data.data as ExpenseRecord[]).map((expense) => {
            const splits = expense.expense_splits ?? [];
            const allSettled = splits.length > 0 && splits.every((s) => s.is_settled);
            return {
              id: expense.id, description: expense.description ?? "", amount: expense.amount ?? 0,
              currency: expense.currency ?? "VND", category: expense.category ?? null,
              expense_date: expense.expense_date,
              context_type: expense.context_type, group_id: expense.group_id,
              group_name: expense.groups?.name ?? null, paid_by_user_id: expense.paid_by_user_id,
              paid_by_name: expense.profiles?.full_name ?? tAdmin("common.unknown"),
              paid_by_avatar: expense.profiles?.avatar_url ?? null,
              is_settled: allSettled, created_at: expense.created_at,
            };
          });
          const filtered = statusFilter === "all" ? transformed : statusFilter === "settled" ? transformed.filter((e: ExpenseRow) => e.is_settled) : transformed.filter((e: ExpenseRow) => !e.is_settled);
          return { ...data, data: filtered, total: statusFilter === "all" ? data.total : filtered.length };
        },
      },
    },
  });

  const handleDelete = useCallback(async () => {
    if (!deleteExpense) return;
    warning();
    setIsDeleting(true);
    try {
      const { error } = await supabaseClient.rpc("soft_delete_expense", { p_expense_id: deleteExpense.id });
      if (error) throw error;
      toast.success(tAdmin("transactions.expenses.deleted", { description: deleteExpense.description }));
      setDeleteDialogOpen(false); setDeleteExpense(null); table.refineCore.tableQuery.refetch();
    } catch (err: unknown) { toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("transactions.expenses.deleteTitle")) })); }
    finally { setIsDeleting(false); }
  }, [deleteExpense, table.refineCore.tableQuery, tAdmin, warning]);

  const handleRefetch = useCallback(() => {
    tap();
    table.refineCore.tableQuery.refetch();
  }, [table.refineCore.tableQuery, tap]);

  const handleSettlementChange = useCallback((expenseId: string, nextIsSettled: boolean) => {
    setSelectedExpense((current) =>
      current && current.id === expenseId
        ? { ...current, is_settled: nextIsSettled }
        : current,
    );
    table.refineCore.tableQuery.refetch();
  }, [table.refineCore.tableQuery]);

  const clearFilters = useCallback(() => { tap(); setSearch(""); setGroupFilter("all"); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); }, [tap]);
  const hasActiveFilters = search !== "" || groupFilter !== "all" || statusFilter !== "all" || dateFrom !== "" || dateTo !== "" || amountMin !== "" || amountMax !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleExpenses = table.reactTable.getRowModel().rows.map((row) => row.original);
  const isDetailVisible = detailOpen && selectedExpense !== null;

  const statusLabel = (value: string) => value === "settled" ? tAdmin("transactions.expenses.settled") : tAdmin("transactions.expenses.pending");
  const filterChips = [
    ...(groupFilter !== "all" ? [{ key: "group", label: tAdmin("transactions.filterChips.group", { value: groups.find((g) => g.id === groupFilter)?.name ?? groupFilter }), onRemove: () => { tap(); setGroupFilter("all"); } }] : []),
    ...(statusFilter !== "all" ? [{ key: "status", label: tAdmin("transactions.filterChips.status", { value: statusLabel(statusFilter) }), onRemove: () => { tap(); setStatusFilter("all"); } }] : []),
    ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => setDateFrom("") }] : []),
    ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => setDateTo("") }] : []),
    ...(amountMin !== "" ? [{ key: "amountMin", label: tAdmin("transactions.filterChips.amountMin", { value: amountMin }), onRemove: () => setAmountMin("") }] : []),
    ...(amountMax !== "" ? [{ key: "amountMax", label: tAdmin("transactions.filterChips.amountMax", { value: amountMax }), onRemove: () => setAmountMax("") }] : []),
  ];

  const filterFields: FilterField[] = [
    { kind: "date", key: "dateFrom", label: tAdmin("common.fromDate"), value: dateFrom, onChange: setDateFrom },
    { kind: "date", key: "dateTo", label: tAdmin("common.toDate"), value: dateTo, onChange: setDateTo },
    {
      kind: "select", key: "group", label: tAdmin("common.group"), value: groupFilter, onChange: (v) => { tap(); setGroupFilter(v); },
      options: [{ value: "all", label: tAdmin("transactions.expenses.allGroups") }, ...groups.map((g) => ({ value: g.id, label: g.name }))],
    },
    {
      kind: "select", key: "status", label: tAdmin("common.status"), hint: tAdmin("transactions.expenses.localPageFilterHint"), value: statusFilter, onChange: (v) => { tap(); setStatusFilter(v); },
      options: [{ value: "all", label: tAdmin("common.all") }, { value: "settled", label: statusLabel("settled") }, { value: "pending", label: statusLabel("pending") }],
    },
    { kind: "number", key: "amountMin", label: tAdmin("transactions.expenses.amountFrom"), placeholder: "0", value: amountMin, onChange: setAmountMin },
    { kind: "number", key: "amountMax", label: tAdmin("transactions.expenses.amountTo"), placeholder: "∞", value: amountMax, onChange: setAmountMax },
  ];

  const master = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AdminPageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tAdmin("transactions.expenses.searchPlaceholder")}
        filterCount={[groupFilter !== "all", statusFilter !== "all", dateFrom !== "", dateTo !== "", amountMin !== "", amountMax !== ""].filter(Boolean).length}
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
          <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {tAdmin("transactions.expenses.create")}
          </Button>
        }
      />
      <AdminFilterChips filters={filterChips} onClearAll={clearFilters} />
      {isEmptyResult && hasActiveFilters ? (
        <Empty className="min-h-[200px] rounded-md border"><EmptyMedia variant="icon"><ReceiptIcon className="h-6 w-6" /></EmptyMedia><EmptyHeader><EmptyTitle>{tAdmin("transactions.expenses.noResultsTitle")}</EmptyTitle><EmptyDescription>{tAdmin("transactions.expenses.noResultsDescription")}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" size="sm" onClick={clearFilters}>{tAdmin("common.clearFilters")}</Button></EmptyContent></Empty>
      ) : (
        <>
          <div className="hidden min-h-0 flex-col gap-2 md:flex">
            <RefineDataGrid
              table={table}
              selectedId={isDetailVisible ? selectedExpense.id : null}
              onRowClick={openDetail}
              offset={tableOffset(filterChips.length > 0)}
            />
            {visibleExpenses.length > 0 ? <RefineDataGridPager table={table} /> : null}
          </div>
          <div className="space-y-3 md:hidden">
            <AdminMobileCards
              items={visibleExpenses}
              getKey={(expense) => expense.id}
              renderItem={(expense) => {
                const cat = getCategoryMeta(expense.category);
                const CatIcon = cat.icon;
                return (
                  <AdminMobileCard
                    title={expense.description}
                    description={`${expense.paid_by_name} · ${formatDate(expense.expense_date)}`}
                    leading={
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${cat.bgColor}`}>
                        <CatIcon size={18} className={cat.color} />
                      </span>
                    }
                    badges={expense.is_settled
                      ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.settled")}</Badge>
                      : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.pending")}</Badge>}
                    meta={[
                      { label: tAdmin("common.amount"), value: <span className="font-mono tabular-nums">{formatNumber(expense.amount)} {expense.currency}</span> },
                      { label: tAdmin("common.group"), value: expense.group_name ?? tAdmin("context.friends") },
                      { label: tAdmin("transactions.expenses.category"), value: cat.name },
                      { label: tAdmin("layout.transactions.id"), value: <span className="font-mono text-xs">{expense.id.slice(0, 8)}</span> },
                    ]}
                    actions={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer" aria-label={tAdmin("common.actions")}><MoreHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(expense)}>{tAdmin("common.details")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { tap(); setEditExpenseId(expense.id); setEditDialogOpen(true); }}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</DropdownMenuItem>
                          {!moderatorMode ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { warning(); setDeleteExpense(expense); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("common.delete")}</DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                    onClick={() => openDetail(expense)}
                    ariaLabel={expense.description}
                  />
                );
              }}
            />
            {visibleExpenses.length > 0 && (
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
    </div>
  );

  return (
    <>
        <AdminMasterDetail
          id="tx-expenses"
          open={isDetailVisible}
          onOpenChange={setDetailOpen}
          title={selectedExpense?.description || tAdmin("common.details")}
          description={selectedExpense ? tAdmin("transactions.expenses.detailDescription", { date: formatDate(selectedExpense.expense_date) }) : undefined}
          footer={selectedExpense ? (
            <ExpenseDetailFooter
              canDelete={!moderatorMode}
              onEdit={() => { setDetailOpen(false); setEditExpenseId(selectedExpense.id); setEditDialogOpen(true); }}
              onDelete={() => { setDetailOpen(false); setDeleteExpense(selectedExpense); setDeleteDialogOpen(true); }}
            />
          ) : undefined}
          master={master}
          detail={selectedExpense ? (
            <ExpenseDetailPanel
              key={selectedExpense.id}
              expense={selectedExpense}
              open={detailOpen}
              onSettlementChange={handleSettlementChange}
              canManageSplits={!moderatorMode}
            />
          ) : null}
        />

      {!moderatorMode ? <DeleteConfirmDialog title={tAdmin("transactions.expenses.deleteTitle")} description={tAdmin("transactions.expenses.deleteDescription", { description: deleteExpense?.description ?? "", amount: formatNumber(deleteExpense?.amount ?? 0) })}
        open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteExpense(null); } }} onConfirm={handleDelete} isDeleting={isDeleting}
      /> : null}
      <AdminCreateExpenseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={handleRefetch} />
      <AdminEditExpenseDialog expenseId={editExpenseId} open={editDialogOpen} onOpenChange={(o) => { if (!o) { setEditDialogOpen(false); setEditExpenseId(null); } }} onSuccess={handleRefetch} />
    </>
  );
}
