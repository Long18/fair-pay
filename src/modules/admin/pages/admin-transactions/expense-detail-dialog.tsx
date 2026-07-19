import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function ExpenseDetailDialog({
  expense, open, onOpenChange, onEdit, onDelete, onSettlementChange, canDelete, canManageSplits,
}: {
  expense: ExpenseRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSettlementChange: (expenseId: string, nextIsSettled: boolean) => void;
  canDelete: boolean;
  canManageSplits: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(false);
  const [updatingSplitId, setUpdatingSplitId] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const expenseId = expense?.id;
  const resolvedIsSettled = getExpenseSettlementStatus(splits, expense?.is_settled ?? false);

  const handleToggleSplitSettlement = useCallback(async (split: ExpenseSplit) => {
    if (!expense) return;

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

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{expense.description}</DialogTitle>
          <DialogDescription>{tAdmin("transactions.expenses.detailDescription", { date: formatDate(expense.expense_date) })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label={tAdmin("common.amount")} value={`${formatNumber(expense.amount)} ${expense.currency}`} />
            <DetailItem label={tAdmin("transactions.expenses.payer")} value={expense.paid_by_name} />
            <DetailItem label={tAdmin("common.group")} value={expense.group_name ?? tAdmin("context.friends")} />
            <DetailItem label={tAdmin("transactions.expenses.context")} value={expense.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")} />
            <DetailItem label={tAdmin("transactions.expenses.category")} value={
              (() => {
                const cat = getCategoryMeta(expense.category);
                const CatIcon = cat.icon;
                return (
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded ${cat.bgColor}`}>
                      <CatIcon size={12} className={cat.color} />
                    </span>
                    <span>{cat.name}</span>
                  </div>
                );
              })()
            } />
            <DetailItem label={tAdmin("common.status")} value={
              resolvedIsSettled
                ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.settled")}</Badge>
                : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.pending")}</Badge>
            } />
            <DetailItem label={tAdmin("common.createdAt")} value={formatDate(expense.created_at)} />
            <DetailItem label="ID" value={<span className="font-mono text-xs">{expense.id}</span>} />
          </div>

          {/* Comment section - parity with Client show page */}
          {comment && comment.trim() !== "" && (
            <div>
              <h4 className="text-sm font-medium mb-2">{tAdmin("transactions.expenses.comment")}</h4>
              <div className="rounded-md border p-3 bg-muted/30">
                <MarkdownComment content={comment} className="text-sm" />
              </div>
            </div>
          )}

          {/* Splits section */}
          <div>
            <h4 className="text-sm font-medium mb-2">{tAdmin("transactions.expenses.splits")}</h4>
            {loadingSplits ? (
              <div className="flex items-center justify-center py-6"><Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : splits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{tAdmin("transactions.expenses.noSplits")}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tAdmin("common.user")}</TableHead>
                      <TableHead>{tAdmin("transactions.expenses.splitMethod")}</TableHead>
                      <TableHead className="text-right">{tAdmin("common.amount")}</TableHead>
                      <TableHead>{tAdmin("common.status")}</TableHead>
                      {canManageSplits ? <TableHead className="text-right">{tAdmin("transactions.expenses.splitUpdate")}</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {splits.map((split) => (
                      <TableRow key={split.id}>
                        <TableCell className="text-sm">{split.user_name}</TableCell>
                        <TableCell className="text-sm capitalize">{split.split_method}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm">{formatNumber(split.computed_amount)}</TableCell>
                        <TableCell>
                          {split.is_settled
                            ? <Badge className="gap-1"><CheckCircle2Icon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.splitPaid")}</Badge>
                            : <Badge variant="outline" className="gap-1"><ClockIcon className="size-3" aria-hidden="true" />{tAdmin("transactions.expenses.splitUnpaid")}</Badge>}
                        </TableCell>
                        {canManageSplits ? <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={split.is_settled ? "outline" : "default"}
                            onClick={() => void handleToggleSplitSettlement(split)}
                            disabled={updatingSplitId === split.id}
                          >
                            {updatingSplitId === split.id ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {split.is_settled ? tAdmin("transactions.expenses.markUnpaid") : tAdmin("transactions.expenses.markPaid")}
                          </Button>
                        </TableCell> : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Attachments section - parity with Client show page */}
          {attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{tAdmin("transactions.expenses.attachments")} ({attachments.length})</h4>
              <AttachmentList attachments={attachments} canDelete={false} />
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</Button>
          {canDelete ? <Button size="sm" variant="destructive" onClick={onDelete}>{tAdmin("common.delete")}</Button> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
