import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  ListFilterIcon,
  Loader2Icon,
  SendIcon,
} from "@/components/ui/icons";
import { formatCurrency, formatRecipientEmails } from "./helpers";
import { DebtTableSkeletonRows } from "./email-preview-ui";
import { RecipientEmailPicker, RecipientIdentity } from "./recipient-ui";
import type { AdminT, DebtReminderRow } from "./types";

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
  setPreviewRow: (row: DebtReminderRow | null) => void;
  handleRemindOne: (row: DebtReminderRow) => Promise<void>;
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
  setPreviewRow,
  handleRemindOne,
}: EmailDebtorsPanelProps) {
  return (
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{tAdmin("devtool.debtorListTitle")}</CardTitle>
              <CardDescription>{tAdmin("devtool.debtorListDescription")}</CardDescription>
            </div>
          </div>
          {debtorsLength > 0 && !isLoading ? (
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex items-center gap-2">
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
                    <SelectTrigger id="group-filter" className="w-full sm:w-[220px]">
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
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {tAdmin("devtool.selectedCount", { selected: selectedRows.length, total: visibleDebtors.length })}
                  {selectedRows.length ? ` · ${formatCurrency(totalDebtSelected)}` : ""}
                </span>
                <Separator orientation="vertical" className="hidden h-4 sm:block" />
                <Button
                  type="button"
                  variant="link"
                  className="h-auto min-h-0 p-0"
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
                  className="h-auto min-h-0 p-0"
                  onClick={() => {
                    tap();
                    setSelectedUserIds([]);
                  }}
                  disabled={!selectedRows.length}
                >
                  {tAdmin("devtool.clearSelection")}
                </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openBulkPreview}
                  disabled={!selectedRows.length || isBusy}
                >
                  <EyeIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {tAdmin("devtool.previewCount", { count: selectedRows.length })}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    tap();
                    setConfirmBulkOpen(true);
                  }}
                  disabled={!selectedRows.length || isBusy}
                >
                  {sendingUserId === "__bulk__" || isBulkScheduling ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SendIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {isBulkScheduling
                    ? tAdmin("devtool.sendingScheduled")
                    : tAdmin("devtool.sendSelectedEmail")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <div className="flex items-center gap-2">
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
                  </div>
                </TableHead>
                <TableHead>{tAdmin("devtool.userColumn")}</TableHead>
                <TableHead>{tAdmin("devtool.recipientEmails")}</TableHead>
                <TableHead className="text-right">{tAdmin("devtool.debtColumn")}</TableHead>
                <TableHead className="text-right">{tAdmin("devtool.relationshipsColumn")}</TableHead>
                <TableHead className="w-[200px] text-right">{tAdmin("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <DebtTableSkeletonRows />
              ) : visibleDebtors.length ? (
                visibleDebtors.map((row) => {
                  const topGroup = row.group_breakdown[0];
                  const topDebt = row.debt_breakdown[0];
                  const rowSelected = selectedUserIdSet.has(row.user_id);
                  return (
                    <TableRow key={row.user_id} data-state={rowSelected ? "selected" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <RecipientIdentity
                          row={row}
                          compact
                          showEmail={false}
                          placeholderLabel={tAdmin("devtool.placeholderRecipient")}
                        />
                        {topGroup ? (
                          <div className="mt-1 pl-11 text-xs text-muted-foreground line-clamp-2">
                            {tAdmin("devtool.topGroup", { name: topGroup.group_name, amount: formatCurrency(topGroup.subtotal_amount, topGroup.currency) })}
                          </div>
                        ) : topDebt ? (
                          <div className="mt-1 pl-11 text-xs text-muted-foreground line-clamp-2">
                            {tAdmin("devtool.debtTo", { name: topDebt.counterparty_name, amount: formatCurrency(topDebt.amount, topDebt.currency) })}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[min(100vw,220px)]">
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
                          <span className="line-clamp-2 break-words" translate="no">
                            {formatRecipientEmails(row, recipientSelections)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.total_i_owe)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.debt_breakdown.length || row.active_debt_relationships}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              tap();
                              setPreviewRow(row);
                            }}
                            disabled={isBusy}
                            aria-label={`${tAdmin("common.preview")} ${row.full_name}`}
                          >
                            <EyeIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            {tAdmin("common.preview")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRemindOne(row)}
                            disabled={isBusy}
                            aria-label={`${tAdmin("devtool.sendReminder")} ${row.full_name}`}
                          >
                            {sendingUserId === row.user_id ? (
                              <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <SendIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            )}
                            {tAdmin("common.send")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {groupFilter === "all" ? tAdmin("devtool.noDebtors") : tAdmin("devtool.noDebtorsInGroup")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
  );
}
