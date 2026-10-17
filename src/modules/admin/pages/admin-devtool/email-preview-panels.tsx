import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EyeIcon, SendIcon } from "@/components/ui/icons";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import { formatCurrency, formatRecipientEmails } from "./helpers";
import { EmailPreviewFrame, EmailPreviewViewportToggle } from "./email-preview-ui";
import { GroupIdentity, RecipientIdentity } from "./recipient-ui";
import type { AdminT, DebtReminderRow, PreviewViewport } from "./types";

type PreviewEmail = { subject: string; previewText: string; html: string };

function SubjectBlock({ email }: { email: PreviewEmail }) {
  return (
    <div className="shrink-0 rounded-lg border bg-muted/30 px-3 py-2">
      <p className="truncate text-sm font-medium" translate="no" title={email.subject}>
        {email.subject}
      </p>
      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{email.previewText}</p>
    </div>
  );
}

function BreakdownList({ row, tAdmin }: { row: DebtReminderRow; tAdmin: AdminT }) {
  if (row.group_breakdown.length) {
    return (
      <section className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tAdmin("devtool.groupSummary")}
        </p>
        <ul className="divide-y rounded-lg border">
          {row.group_breakdown.slice(0, 6).map((group) => (
            <li
              key={`${group.group_id || group.group_name}-${group.currency}`}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <GroupIdentity group={group} />
              <span className="shrink-0 text-sm font-semibold text-destructive tabular-nums">
                {formatCurrency(group.subtotal_amount, group.currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (row.debt_breakdown.length) {
    return (
      <section className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tAdmin("devtool.debtSummary")}
        </p>
        <ul className="divide-y rounded-lg border">
          {row.debt_breakdown.slice(0, 6).map((item) => (
            <li
              key={`${item.counterparty_key}-${item.currency}`}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-medium">{item.counterparty_name}</span>
              <span className="shrink-0 text-sm font-semibold text-destructive tabular-nums">
                {formatCurrency(item.amount, item.currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return null;
}

/** Body of the single-recipient preview (split pane on xl, sheet below). */
export function EmailSinglePreviewBody({
  row,
  email,
  viewport,
  setViewport,
  recipientSelections,
  tAdmin,
}: {
  row: DebtReminderRow;
  email: PreviewEmail;
  viewport: PreviewViewport;
  setViewport: (value: PreviewViewport) => void;
  recipientSelections: Record<string, string[]>;
  tAdmin: AdminT;
}) {
  const [tab, setTab] = useState("email");
  const breakdownCount = row.group_breakdown.length || row.debt_breakdown.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <SubjectBlock email={email} />
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-8">
            <TabsTrigger value="email" className="px-2.5 text-xs">
              {tAdmin("layout.devtoolTools.email.emailTab")}
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="px-2.5 text-xs">
              {tAdmin("layout.devtoolTools.email.breakdownTab")}
              {breakdownCount ? (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
                  {breakdownCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          {tab === "email" ? (
            <EmailPreviewViewportToggle value={viewport} onChange={setViewport} tAdmin={tAdmin} />
          ) : null}
        </div>
        <TabsContent value="email" className="flex min-h-0 flex-col">
          <EmailPreviewFrame html={email.html} title="Reminder email preview" viewport={viewport} fill />
        </TabsContent>
        <TabsContent value="breakdown" className="space-y-3">
          <RecipientIdentity
            row={row}
            emailLabel={formatRecipientEmails(row, recipientSelections)}
            placeholderLabel={tAdmin("devtool.placeholderRecipient")}
          />
          <BreakdownList row={row} tAdmin={tAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** "Preview" tab: pick a selected recipient on the left, inspect the email on the right. */
export function EmailBulkPreviewPanel({
  tAdmin,
  selectedRows,
  focusRow,
  setFocusUserId,
  viewport,
  setViewport,
  email,
  recipientSelections,
  isBusy,
  onConfirm,
  onGoToRecipients,
}: {
  tAdmin: AdminT;
  selectedRows: DebtReminderRow[];
  focusRow: DebtReminderRow | null;
  setFocusUserId: (userId: string) => void;
  viewport: PreviewViewport;
  setViewport: (value: PreviewViewport) => void;
  email: PreviewEmail | null;
  recipientSelections: Record<string, string[]>;
  isBusy: boolean;
  onConfirm: () => void;
  onGoToRecipients: () => void;
}) {
  if (!selectedRows.length) {
    return (
      <AdminEmptyState
        icon={<EyeIcon className="h-5 w-5" />}
        title={tAdmin("layout.devtoolTools.email.previewEmptyTitle")}
        description={tAdmin("layout.devtoolTools.email.previewEmptyBody")}
        action={{
          label: tAdmin("layout.devtoolTools.email.goToRecipients"),
          onClick: onGoToRecipients,
        }}
        className="rounded-lg border border-dashed py-6"
      />
    );
  }

  return (
    <div className="grid gap-3 lg:h-[calc(100dvh-var(--admin-nav-h)-15rem)] lg:min-h-[28rem] lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/15 p-3">
        <div className="space-y-1.5">
          <Label htmlFor="bulk-preview-user" className="text-xs">
            {tAdmin("devtool.previewRecipient")}
          </Label>
          <Select value={focusRow?.user_id} onValueChange={setFocusUserId}>
            <SelectTrigger id="bulk-preview-user" className="h-8 w-full text-xs">
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
        {focusRow ? (
          <RecipientIdentity
            row={focusRow}
            emailLabel={formatRecipientEmails(focusRow, recipientSelections)}
            placeholderLabel={tAdmin("devtool.placeholderRecipient")}
          />
        ) : null}
        {email ? <SubjectBlock email={email} /> : null}
        <Button
          type="button"
          size="sm"
          className="mt-auto w-full"
          onClick={onConfirm}
          disabled={!selectedRows.length || isBusy}
        >
          <SendIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {tAdmin("devtool.continueConfirm")}
        </Button>
      </aside>
      {email && focusRow ? (
        <section className="flex min-h-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {tAdmin("devtool.bulkPreviewTitle")}
            </p>
            <EmailPreviewViewportToggle value={viewport} onChange={setViewport} tAdmin={tAdmin} />
          </div>
          <EmailPreviewFrame
            html={email.html}
            title="Bulk reminder email preview"
            viewport={viewport}
            fill
          />
        </section>
      ) : null}
    </div>
  );
}
