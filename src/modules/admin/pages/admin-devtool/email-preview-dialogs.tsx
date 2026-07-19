import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2Icon, SendIcon } from "@/components/ui/icons";
import { formatCurrency, formatRecipientEmails } from "./helpers";
import {
  EmailPreviewFrame,
  EmailPreviewViewportToggle,
} from "./email-preview-ui";
import { GroupIdentity, RecipientIdentity } from "./recipient-ui";
import type {
  AdminT,
  DebtReminderRow,
  PreviewViewport,
} from "./types";

export interface EmailPreviewDialogsProps {
  tAdmin: AdminT;
  isBusy: boolean;
  sendingUserId: string | null;
  previewRow: DebtReminderRow | null;
  setPreviewRow: (row: DebtReminderRow | null) => void;
  previewViewport: PreviewViewport;
  setPreviewViewport: (value: PreviewViewport) => void;
  previewEmail: { subject: string; previewText: string; html: string } | null;
  recipientSelections: Record<string, string[]>;
  handleRemindOne: (row: DebtReminderRow) => Promise<void>;
  bulkPreviewOpen: boolean;
  setBulkPreviewOpen: (open: boolean) => void;
  selectedRows: DebtReminderRow[];
  effectiveBulkFocusRow: DebtReminderRow | null;
  setBulkPreviewFocusUserId: (userId: string) => void;
  bulkPreviewViewport: PreviewViewport;
  setBulkPreviewViewport: (value: PreviewViewport) => void;
  bulkPreviewEmail: { subject: string; previewText: string; html: string } | null;
  confirmBulkOpen: boolean;
  setConfirmBulkOpen: (open: boolean) => void;
  handleRemindSelected: () => Promise<void>;
}

export function EmailPreviewDialogs({
  tAdmin,
  isBusy,
  sendingUserId,
  previewRow,
  setPreviewRow,
  previewViewport,
  setPreviewViewport,
  previewEmail,
  recipientSelections,
  handleRemindOne,
  bulkPreviewOpen,
  setBulkPreviewOpen,
  selectedRows,
  effectiveBulkFocusRow,
  setBulkPreviewFocusUserId,
  bulkPreviewViewport,
  setBulkPreviewViewport,
  bulkPreviewEmail,
  confirmBulkOpen,
  setConfirmBulkOpen,
  handleRemindSelected,
}: EmailPreviewDialogsProps) {
  return (
    <>
      <Dialog
        open={previewRow !== null}
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setPreviewRow(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-6xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>{tAdmin("devtool.previewEmailTitle")}</DialogTitle>
            <DialogDescription>
              {previewRow ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{tAdmin("devtool.sendTo", { name: previewRow.full_name, email: formatRecipientEmails(previewRow, recipientSelections) })}</span>
                  {!previewRow.has_auth_account ? (
                    <Badge variant="secondary">{tAdmin("devtool.placeholderRecipient")}</Badge>
                  ) : null}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            {previewEmail && previewRow ? (
              <>
                <aside className="min-h-0 space-y-4 overflow-y-auto border-b bg-muted/15 px-4 py-4 lg:border-r lg:border-b-0 sm:px-6">
                  <RecipientIdentity
                    row={previewRow}
                    emailLabel={formatRecipientEmails(previewRow, recipientSelections)}
                    placeholderLabel={tAdmin("devtool.placeholderRecipient")}
                  />
                  <div className="rounded-xl border bg-background p-3 text-sm shadow-xs">
                    <p className="font-medium" translate="no">
                      {previewEmail.subject}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {previewEmail.previewText}
                    </p>
                  </div>
                  {previewRow.group_breakdown.length ? (
                    <div className="rounded-xl border bg-background p-3 shadow-xs">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {tAdmin("devtool.groupSummary")}
                      </p>
                      <div className="mt-3 space-y-2">
                        {previewRow.group_breakdown.slice(0, 6).map((group) => (
                          <div
                            key={`${group.group_id || group.group_name}-${group.currency}`}
                            className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-2.5"
                          >
                            <GroupIdentity group={group} />
                            <p className="shrink-0 text-sm font-semibold text-destructive tabular-nums">
                              {formatCurrency(group.subtotal_amount, group.currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : previewRow.debt_breakdown.length ? (
                    <div className="rounded-xl border bg-background p-3 shadow-xs">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {tAdmin("devtool.debtSummary")}
                      </p>
                      <div className="mt-3 space-y-2">
                        {previewRow.debt_breakdown.slice(0, 6).map((item) => (
                          <div
                            key={`${item.counterparty_key}-${item.currency}`}
                            className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-2.5"
                          >
                            <p className="min-w-0 text-sm font-medium leading-5">
                              {item.counterparty_name}
                            </p>
                            <p className="shrink-0 text-sm font-semibold text-destructive tabular-nums">
                              {formatCurrency(item.amount, item.currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </aside>
                <section className="flex min-h-0 flex-col gap-3 px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {tAdmin("devtool.previewViewport")}
                    </p>
                    <EmailPreviewViewportToggle
                      value={previewViewport}
                      onChange={setPreviewViewport}
                      tAdmin={tAdmin}
                    />
                  </div>
                  <EmailPreviewFrame
                    html={previewEmail.html}
                    title="Reminder email preview"
                    viewport={previewViewport}
                    tall
                  />
                </section>
              </>
            ) : null}
          </div>
          <DialogFooter className="border-t bg-background/95 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewRow(null)}
              disabled={isBusy}
            >
              {tAdmin("common.close")}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!previewRow) return;
                const row = previewRow;
                await handleRemindOne(row);
                setPreviewRow(null);
              }}
              disabled={isBusy}
            >
              {sendingUserId === previewRow?.user_id ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {sendingUserId === previewRow?.user_id ? tAdmin("devtool.sending") : tAdmin("devtool.sendReminder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkPreviewOpen} onOpenChange={setBulkPreviewOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-6xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>{tAdmin("devtool.bulkPreviewTitle")}</DialogTitle>
            <DialogDescription>
              {tAdmin("devtool.bulkPreviewDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <aside className="min-h-0 space-y-4 overflow-y-auto border-b bg-muted/15 px-4 py-4 lg:border-r lg:border-b-0 sm:px-6">
              {selectedRows.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="bulk-preview-user">{tAdmin("devtool.previewRecipient")}</Label>
                  <Select
                    value={effectiveBulkFocusRow?.user_id}
                    onValueChange={setBulkPreviewFocusUserId}
                  >
                    <SelectTrigger id="bulk-preview-user" className="w-full">
                      <SelectValue placeholder={tAdmin("devtool.previewRecipient")} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedRows.map((r) => (
                        <SelectItem key={r.user_id} value={r.user_id}>
                          {r.full_name} ({formatRecipientEmails(r, recipientSelections)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {tAdmin("devtool.bulkPreviewHint", { count: selectedRows.length })}
                  </p>
                </div>
              ) : null}
              {effectiveBulkFocusRow ? (
                <RecipientIdentity
                  row={effectiveBulkFocusRow}
                  emailLabel={formatRecipientEmails(effectiveBulkFocusRow, recipientSelections)}
                  placeholderLabel={tAdmin("devtool.placeholderRecipient")}
                />
              ) : null}
              {bulkPreviewEmail ? (
                <div className="rounded-xl border bg-background p-3 text-sm shadow-xs">
                  <p className="font-medium" translate="no">
                    {bulkPreviewEmail.subject}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {bulkPreviewEmail.previewText}
                  </p>
                </div>
              ) : null}
            </aside>
            {bulkPreviewEmail && effectiveBulkFocusRow ? (
              <section className="flex min-h-0 flex-col gap-3 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {tAdmin("devtool.previewViewport")}
                  </p>
                  <EmailPreviewViewportToggle
                    value={bulkPreviewViewport}
                    onChange={setBulkPreviewViewport}
                    tAdmin={tAdmin}
                  />
                </div>
                <EmailPreviewFrame
                  html={bulkPreviewEmail.html}
                  title="Bulk reminder email preview"
                  viewport={bulkPreviewViewport}
                />
              </section>
            ) : null}
          </div>
          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setBulkPreviewOpen(false)}>
              {tAdmin("common.close")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setBulkPreviewOpen(false);
                setConfirmBulkOpen(true);
              }}
              disabled={!selectedRows.length}
            >
              {tAdmin("devtool.continueConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{tAdmin("devtool.confirmBulkTitle", { count: selectedRows.length })}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{tAdmin("devtool.emailRecipients")}</p>
                <ScrollArea className="h-40 max-h-40 rounded-md border pr-2">
                  <ol className="list-inside list-decimal space-y-1 px-3 py-2 text-left text-sm">
                    {selectedRows.map((r) => (
                      <li key={r.user_id} className="min-w-0 break-words" translate="no">
                        {r.full_name} — {formatRecipientEmails(r, recipientSelections)}
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {tAdmin("devtool.confirmBulkDescription")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tAdmin("devtool.confirmBulkTimingHint")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingUserId === "__bulk__"}>{tAdmin("common.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              disabled={sendingUserId === "__bulk__"}
              onClick={() => {
                void handleRemindSelected();
              }}
            >
              {sendingUserId === "__bulk__" ? tAdmin("devtool.sending") : tAdmin("devtool.sendEmail")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
