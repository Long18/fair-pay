import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  PencilIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { MarkdownComment } from "@/modules/expenses/components/markdown-comment";
import { AttachmentList } from "@/modules/expenses/components/attachment-list";
import { Attachment } from "@/modules/expenses/types";
import {
  applySplitSettlementChangeTyped,
  getExpenseSettlementStatus,
} from "../admin-transactions.utils";
import { useAdminTranslation } from "../../i18n";
import { DetailItem } from "./shared-ui";
import type { ExpenseRow, ExpenseSplit } from "./types";

function SettlementBadge({ settled, settledLabel, pendingLabel }: { settled: boolean; settledLabel: string; pendingLabel: string }) {
  return settled
    ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{settledLabel}</Badge>
    : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{pendingLabel}</Badge>;
}

export function ExpenseDetailFooter({
  onEdit, onDelete, canDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  return (
    <>
      {canDelete ? <Button size="sm" variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={onDelete}>{tAdmin("common.delete")}</Button> : null}
      <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</Button>
    </>
  );
}

export function ExpenseDetailPanel({
  expense, open, onSettlementChange, canManageSplits,
}: {
  expense: ExpenseRow;
  open: boolean;
  onSettlementChange: (expenseId: string, nextIsSettled: boolean) => void;
  canManageSplits: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(false);
  const [updatingSplitId, setUpdatingSplitId] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const expenseId = expense.id;
  const resolvedIsSettled = getExpenseSettlementStatus(splits, expense.is_settled);

  const handleToggleSplitSettlement = useCallback(async (split: ExpenseSplit) => {
    setUpdatingSplitId(split.id);
    try {
      const { error } = split.is_settled
        ? await supabaseClient.rpc("unsettle_split", { p_split_id: split.id })
        : await supabaseClient.rpc("settle_split", {
            p_split_id: split.id,
            p_amount: split.computed_amount,
          });

      if (error) throw error;

      const nextSplits = applySplitSettlementChangeTyped(splits, split.id, !split.is_settled);
      setSplits(nextSplits);

      const nextStatus = getExpenseSettlementStatus(nextSplits, expense.is_settled);
      onSettlementChange(expense.id, nextStatus);

      toast.success(
        split.is_settled
          ? tAdmin("transactions.expenses.splitMarkedUnpaid", { name: split.user_name })
          : tAdmin("transactions.expenses.splitMarkedPaid", { name: split.user_name }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tAdmin("transactions.expenses.splitSettlementError");
      toast.error(tAdmin("common.errorWithMessage", { message }));
    } finally {
      setUpdatingSplitId(null);
    }
  }, [expense, onSettlementChange, splits, tAdmin]);

  useEffect(() => {
    if (!expenseId || !open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSplits(true);
    type ExpenseSplitResponse = {
      id: string;
      user_id: string;
      split_method: string;
      computed_amount: number;
      is_settled: boolean | null;
      settled_amount: number | null;
      profiles?: {
        full_name: string | null;
      } | null;
    };

    // Fetch splits, comment, and attachments in parallel
    Promise.all([
      supabaseClient
        .from("expense_splits")
        .select("*, profiles!expense_splits_user_id_fkey(full_name)")
        .eq("expense_id", expenseId),
      supabaseClient
        .from("expenses")
        .select("comment")
        .eq("id", expenseId)
        .single(),
      supabaseClient
        .from("attachments")
        .select("*")
        .eq("expense_id", expenseId),
    ]).then(([splitsRes, commentRes, attachmentsRes]) => {
      if (!splitsRes.error && splitsRes.data) {
        setSplits((splitsRes.data as ExpenseSplitResponse[]).map((s) => ({
          id: s.id, user_id: s.user_id, user_name: s.profiles?.full_name ?? tAdmin("common.unknown"),
          split_method: s.split_method, computed_amount: s.computed_amount,
          is_settled: s.is_settled ?? false, settled_amount: s.settled_amount ?? 0,
        })));
      }
      if (!commentRes.error && commentRes.data) {
        setComment(commentRes.data.comment);
      }
      if (!attachmentsRes.error && attachmentsRes.data) {
        setAttachments(attachmentsRes.data);
      }
      setLoadingSplits(false);
    });
  }, [expenseId, open, tAdmin]);

  const category = getCategoryMeta(expense.category);
  const CategoryIcon = category.icon;
  const paidCount = splits.filter((split) => split.is_settled).length;
  const countLabel = (count: number) => (loadingSplits ? "…" : count);

  return (
    <Tabs defaultValue="details" variant="underline" className="gap-3">
      <TabsList className="w-full justify-start overflow-x-auto scrollbar-none">
        <TabsTrigger value="details" className="flex-none">{tAdmin("layout.transactions.detailsTab")}</TabsTrigger>
        <TabsTrigger value="splits" className="flex-none">{tAdmin("layout.transactions.splitsTab", { value: countLabel(splits.length) })}</TabsTrigger>
        <TabsTrigger value="attachments" className="flex-none">{tAdmin("layout.transactions.attachmentsTab", { value: countLabel(attachments.length) })}</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{tAdmin("common.amount")}</p>
            <p className="truncate font-mono text-lg font-semibold tabular-nums">{formatNumber(expense.amount)} <span className="text-sm font-normal text-muted-foreground">{expense.currency}</span></p>
          </div>
          <SettlementBadge settled={resolvedIsSettled} settledLabel={tAdmin("transactions.expenses.settled")} pendingLabel={tAdmin("transactions.expenses.pending")} />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailItem label={tAdmin("transactions.expenses.payer")} value={expense.paid_by_name} />
          <DetailItem label={tAdmin("common.group")} value={expense.group_name ?? tAdmin("context.friends")} />
          <DetailItem label={tAdmin("transactions.expenses.context")} value={expense.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")} />
          <DetailItem label={tAdmin("transactions.expenses.category")} value={
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center h-5 w-5 rounded ${category.bgColor}`}>
                <CategoryIcon size={12} className={category.color} />
              </span>
              <span>{category.name}</span>
            </div>
          } />
          <DetailItem label={tAdmin("transactions.expenses.date")} value={formatDate(expense.expense_date)} />
          <DetailItem label={tAdmin("common.createdAt")} value={formatDate(expense.created_at)} />
          <div className="col-span-2">
            <DetailItem label={tAdmin("layout.transactions.id")} value={<span className="break-all font-mono text-xs">{expense.id}</span>} />
          </div>
        </div>
        {comment && comment.trim() !== "" && (
          <div className="space-y-1.5">
            <h4 className="text-xs text-muted-foreground">{tAdmin("transactions.expenses.comment")}</h4>
            <div className="rounded-md border bg-muted/30 p-3">
              <MarkdownComment content={comment} className="text-sm" />
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="splits" className="space-y-2">
        {loadingSplits ? (
          <div className="flex items-center justify-center py-6"><Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : splits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{tAdmin("transactions.expenses.noSplits")}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground tabular-nums">
              {tAdmin("transactions.expenses.splitPaid")}: {paidCount}/{splits.length}
            </p>
            <ul className="divide-y rounded-md border">
              {splits.map((split) => (
                <li key={split.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{split.user_name}</p>
                      <span className="shrink-0 font-mono text-sm tabular-nums">{formatNumber(split.computed_amount)}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <SettlementBadge settled={split.is_settled} settledLabel={tAdmin("transactions.expenses.splitPaid")} pendingLabel={tAdmin("transactions.expenses.splitUnpaid")} />
                      <span className="truncate text-xs capitalize text-muted-foreground">{tAdmin("transactions.expenses.splitMethod")}: {split.split_method}</span>
                    </div>
                  </div>
                  {canManageSplits ? (
                    <Button
                      size="sm"
                      variant={split.is_settled ? "outline" : "default"}
                      className="h-8 shrink-0"
                      onClick={() => void handleToggleSplitSettlement(split)}
                      disabled={updatingSplitId === split.id}
                    >
                      {updatingSplitId === split.id ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {split.is_settled ? tAdmin("transactions.expenses.markUnpaid") : tAdmin("transactions.expenses.markPaid")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </TabsContent>

      <TabsContent value="attachments">
        {loadingSplits ? (
          <div className="flex items-center justify-center py-6"><Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : attachments.length > 0 ? (
          <AttachmentList attachments={attachments} canDelete={false} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">{tAdmin("transactions.expenses.noAttachments")}</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
