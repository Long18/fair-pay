import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EyeIcon,
  InfoIcon,
  ListFilterIcon,
  Loader2Icon,
  SendIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { AdminMasterDetail } from "../../components/AdminMasterDetail";
import { AdminTableScroll } from "../../components/AdminTableScroll";
import { formatCurrency, formatRecipientEmails } from "./helpers";
import { DebtTableSkeletonRows } from "./email-preview-ui";
import { EmailSinglePreviewBody } from "./email-preview-panels";
import { RecipientEmailPicker, RecipientIdentity } from "./recipient-ui";
import type { AdminT, DebtReminderRow, PreviewViewport } from "./types";

export interface EmailDebtorsPanelProps {
  tAdmin: AdminT;
  tap: () => void;
  isLoading: boolean;
  isBusy: boolean;
  isBulkScheduling: boolean;
  sendingUserId: string | null;
  debtorsLength: number;
  groupFilter: string;
  setGroupFilter: (value: string) => void;
  setSelectedUserIds: Dispatch<SetStateAction<string[]>>;
  groupOptions: { value: string; label: string }[];
  selectedRows: DebtReminderRow[];
  visibleDebtors: DebtReminderRow[];
  totalDebtSelected: number;
  allSelected: boolean;
  someSelected: boolean;
  selectedUserIdSet: Set<string>;
  recipientSelections: Record<string, string[]>;
  setRecipientSelections: Dispatch<SetStateAction<Record<string, string[]>>>;
  openBulkPreview: () => void;
  setConfirmBulkOpen: (open: boolean) => void;
  previewRow: DebtReminderRow | null;
  setPreviewRow: (row: DebtReminderRow | null) => void;
  previewEmail: { subject: string; previewText: string; html: string } | null;
  previewViewport: PreviewViewport;
  setPreviewViewport: (value: PreviewViewport) => void;
  handleRemindOne: (row: DebtReminderRow) => Promise<void>;
}

interface DebtorsToolbarProps {
  tAdmin: AdminT;
  tap: () => void;
  isBusy: boolean;
  isBulkScheduling: boolean;
  sendingUserId: string | null;
  groupFilter: string;
  setGroupFilter: (value: string) => void;
  setSelectedUserIds: Dispatch<SetStateAction<string[]>>;
  groupOptions: { value: string; label: string }[];
  selectedCount: number;
  visibleDebtors: DebtReminderRow[];
  totalDebtSelected: number;
  openBulkPreview: () => void;
  setConfirmBulkOpen: (open: boolean) => void;
}

function DebtorsToolbar({
  tAdmin,
  tap,
  isBusy,
  isBulkScheduling,
  sendingUserId,
  groupFilter,
  setGroupFilter,
  setSelectedUserIds,
  groupOptions,
  selectedCount,
  visibleDebtors,
  totalDebtSelected,
  openBulkPreview,
  setConfirmBulkOpen,
}: DebtorsToolbarProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5">
        <ListFilterIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Label htmlFor="group-filter" className="sr-only">
          {tAdmin("devtool.groupFilter")}
        </Label>
        <Select
          value={groupFilter}
          onValueChange={(value) => {
            tap();
            setGroupFilter(value);
            setSelectedUserIds([]);
          }}
        >
          <SelectTrigger id="group-filter" className="h-8 w-[min(60vw,200px)] text-xs">
            <SelectValue placeholder={tAdmin("devtool.groupFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAdmin("devtool.allGroups")}</SelectItem>
            {groupOptions.map((group) => (
              <SelectItem key={group.value} value={group.value}>
                {group.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              aria-label={tAdmin("layout.devtoolTools.email.aboutList")}
            >
              <InfoIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-1 p-3 text-xs">
            <p className="font-medium">{tAdmin("devtool.debtorListTitle")}</p>
            <p className="text-muted-foreground">{tAdmin("devtool.debtorListDescription")}</p>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">
          {tAdmin("devtool.selectedCount", { selected: selectedCount, total: visibleDebtors.length })}
          {selectedCount ? ` · ${formatCurrency(totalDebtSelected)}` : ""}
        </span>
        <Separator orientation="vertical" className="hidden h-4 sm:block" />
        <Button
          type="button"
          variant="link"
          className="h-auto min-h-0 p-0 text-xs"
          onClick={() => {
            tap();
            setSelectedUserIds(visibleDebtors.map((d) => d.user_id));
          }}
        >
          {tAdmin("common.all")}
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-auto min-h-0 p-0 text-xs"
          onClick={() => {
            tap();
            setSelectedUserIds([]);
          }}
          disabled={!selectedCount}
        >
          {tAdmin("devtool.clearSelection")}
        </Button>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8"
          onClick={openBulkPreview}
          disabled={!selectedCount || isBusy}
        >
          <EyeIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {tAdmin("devtool.previewCount", { count: selectedCount })}
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          onClick={() => {
            tap();
            setConfirmBulkOpen(true);
          }}
          disabled={!selectedCount || isBusy}
        >
          {sendingUserId === "__bulk__" || isBulkScheduling ? (
            <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <SendIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          )}
          {isBulkScheduling
            ? tAdmin("devtool.sendingScheduled")
            : tAdmin("devtool.sendSelectedEmail")}
        </Button>
      </div>
    </div>
  );
}

interface DebtorTableRowProps {
  row: DebtReminderRow;
  rowSelected: boolean;
  isPreviewed: boolean;
  previewOpen: boolean;
  tAdmin: AdminT;
  tap: () => void;
  isBusy: boolean;
  sendingUserId: string | null;
  setSelectedUserIds: Dispatch<SetStateAction<string[]>>;
  recipientSelections: Record<string, string[]>;
  setRecipientSelections: Dispatch<SetStateAction<Record<string, string[]>>>;
  setPreviewRow: (row: DebtReminderRow | null) => void;
  handleRemindOne: (row: DebtReminderRow) => Promise<void>;
}

function DebtorTableRow({
  row,
  rowSelected,
  isPreviewed,
  previewOpen,
  tAdmin,
  tap,
  isBusy,
  sendingUserId,
  setSelectedUserIds,
  recipientSelections,
  setRecipientSelections,
  setPreviewRow,
  handleRemindOne,
}: DebtorTableRowProps) {
  const topGroup = row.group_breakdown[0];
  const topDebt = row.debt_breakdown[0];
  return (
    <TableRow
      data-state={rowSelected ? "selected" : undefined}
      className={cn(isPreviewed && "bg-primary/5 shadow-[inset_2px_0_0_var(--primary)]")}
    >
      <TableCell className="py-2">
        <Checkbox
          id={`debtor-${row.user_id}`}
          checked={rowSelected}
          onCheckedChange={(checked) => {
            setSelectedUserIds((prev) => {
              if (checked === true) {
                if (prev.includes(row.user_id)) return prev;
                return [...prev, row.user_id];
              }
              return prev.filter((id) => id !== row.user_id);
            });
          }}
          disabled={isBusy}
          aria-label={`${tAdmin("common.select")} ${row.full_name}`}
        />
      </TableCell>
      <TableCell className="min-w-0 py-2">
        <RecipientIdentity
          row={row}
          compact
          showEmail={false}
          placeholderLabel={tAdmin("devtool.placeholderRecipient")}
        />
        {topGroup ? (
          <div className="mt-0.5 line-clamp-1 pl-11 text-xs text-muted-foreground">
            {tAdmin("devtool.topGroup", { name: topGroup.group_name, amount: formatCurrency(topGroup.subtotal_amount, topGroup.currency) })}
          </div>
        ) : topDebt ? (
          <div className="mt-0.5 line-clamp-1 pl-11 text-xs text-muted-foreground">
            {tAdmin("devtool.debtTo", { name: topDebt.counterparty_name, amount: formatCurrency(topDebt.amount, topDebt.currency) })}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="min-w-0 max-w-[min(100vw,220px)] py-2">
        {row.emails.length > 1 ? (
          <RecipientEmailPicker
            row={row}
            selectedEmails={recipientSelections[row.user_id] ?? []}
            onChange={(emails) => {
              setRecipientSelections((previous) => ({ ...previous, [row.user_id]: emails }));
            }}
            disabled={isBusy}
            tAdmin={tAdmin}
          />
        ) : (
          <span className="line-clamp-2 break-words text-xs sm:text-sm" translate="no">
            {formatRecipientEmails(row, recipientSelections)}
          </span>
        )}
      </TableCell>
      <TableCell className="py-2 text-right font-medium tabular-nums">
        {formatCurrency(row.total_i_owe)}
      </TableCell>
      <TableCell className={cn("py-2 text-right tabular-nums", previewOpen && "xl:hidden")}>
        {row.debt_breakdown.length || row.active_debt_relationships}
      </TableCell>
      <TableCell className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant={isPreviewed ? "secondary" : "outline"}
            className="h-8"
            onClick={() => {
              tap();
              setPreviewRow(row);
            }}
            disabled={isBusy}
            aria-pressed={isPreviewed}
            aria-label={`${tAdmin("common.preview")} ${row.full_name}`}
          >
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            <span className={cn("ml-1 hidden sm:inline", previewOpen && "xl:hidden")}>
              {tAdmin("common.preview")}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={() => handleRemindOne(row)}
            disabled={isBusy}
            aria-label={`${tAdmin("devtool.sendReminder")} ${row.full_name}`}
          >
            {sendingUserId === row.user_id ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" aria-hidden="true" />
            )}
            <span className={cn("ml-1 hidden sm:inline", previewOpen && "xl:hidden")}>
              {tAdmin("common.send")}
            </span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function EmailDebtorsPanel({
  tAdmin,
  tap,
  isLoading,
  isBusy,
  isBulkScheduling,
  sendingUserId,
  debtorsLength,
  groupFilter,
  setGroupFilter,
  setSelectedUserIds,
  groupOptions,
  selectedRows,
  visibleDebtors,
  totalDebtSelected,
  allSelected,
  someSelected,
  selectedUserIdSet,
  recipientSelections,
  setRecipientSelections,
  openBulkPreview,
  setConfirmBulkOpen,
  previewRow,
  setPreviewRow,
  previewEmail,
  previewViewport,
  setPreviewViewport,
  handleRemindOne,
}: EmailDebtorsPanelProps) {
  const previewOpen = previewRow !== null;
  const isSendingPreviewRow = previewRow !== null && sendingUserId === previewRow.user_id;
  const rowProps = {
    previewOpen,
    tAdmin,
    tap,
    isBusy,
    sendingUserId,
    setSelectedUserIds,
    recipientSelections,
    setRecipientSelections,
    setPreviewRow,
    handleRemindOne,
  };

  const table = (
    <AdminTableScroll offset="17rem">
      <Table containerClassName="overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                id="select-all-debtors"
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => {
                  if (checked === true) {
                    setSelectedUserIds(visibleDebtors.map((d) => d.user_id));
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
                disabled={!visibleDebtors.length || isLoading}
                aria-label={tAdmin("devtool.selectAllDebtors")}
              />
              <Label htmlFor="select-all-debtors" className="sr-only">
                {tAdmin("devtool.selectAllDebtors")}
              </Label>
            </TableHead>
            <TableHead>{tAdmin("devtool.userColumn")}</TableHead>
            <TableHead>{tAdmin("devtool.recipientEmails")}</TableHead>
            <TableHead className="text-right">{tAdmin("devtool.debtColumn")}</TableHead>
            <TableHead className={cn("text-right", previewOpen && "xl:hidden")}>
              {tAdmin("devtool.relationshipsColumn")}
            </TableHead>
            <TableHead className="text-right">{tAdmin("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <DebtTableSkeletonRows />
          ) : visibleDebtors.length ? (
            visibleDebtors.map((row) => (
              <DebtorTableRow
                key={row.user_id}
                row={row}
                rowSelected={selectedUserIdSet.has(row.user_id)}
                isPreviewed={previewRow?.user_id === row.user_id}
                {...rowProps}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {groupFilter === "all" ? tAdmin("devtool.noDebtors") : tAdmin("devtool.noDebtorsInGroup")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AdminTableScroll>
  );

  return (
    <div className="space-y-2">
      {debtorsLength > 0 && !isLoading ? (
        <DebtorsToolbar
          tAdmin={tAdmin}
          tap={tap}
          isBusy={isBusy}
          isBulkScheduling={isBulkScheduling}
          sendingUserId={sendingUserId}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          setSelectedUserIds={setSelectedUserIds}
          groupOptions={groupOptions}
          selectedCount={selectedRows.length}
          visibleDebtors={visibleDebtors}
          totalDebtSelected={totalDebtSelected}
          openBulkPreview={openBulkPreview}
          setConfirmBulkOpen={setConfirmBulkOpen}
        />
      ) : null}

      <AdminMasterDetail
        id="admin-email-debtors"
        master={table}
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setPreviewRow(null);
          }
        }}
        size="xl"
        title={tAdmin("devtool.previewEmailTitle")}
        description={
          previewRow ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span>{tAdmin("devtool.sendTo", { name: previewRow.full_name, email: formatRecipientEmails(previewRow, recipientSelections) })}</span>
              {!previewRow.has_auth_account ? (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {tAdmin("devtool.placeholderRecipient")}
                </Badge>
              ) : null}
            </span>
          ) : undefined
        }
        bodyClassName="flex flex-col py-3"
        footer={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPreviewRow(null)}
              disabled={isBusy}
            >
              {tAdmin("common.close")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                if (!previewRow) return;
                const row = previewRow;
                await handleRemindOne(row);
                setPreviewRow(null);
              }}
              disabled={isBusy}
            >
              {isSendingPreviewRow ? (
                <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              {isSendingPreviewRow ? tAdmin("devtool.sending") : tAdmin("devtool.sendReminder")}
            </Button>
          </>
        }
        detail={
          previewRow && previewEmail ? (
            <EmailSinglePreviewBody
              key={previewRow.user_id}
              row={previewRow}
              email={previewEmail}
              viewport={previewViewport}
              setViewport={setPreviewViewport}
              recipientSelections={recipientSelections}
              tAdmin={tAdmin}
            />
          ) : null
        }
      />
    </div>
  );
}
