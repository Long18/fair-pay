import { useState, useMemo, useEffect, useCallback } from "react";
import { useGetIdentity } from "@refinedev/core";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { ExpenseForm } from "@/modules/expenses/components/expense-form";
import { ExpenseFormValues, Expense, Attachment } from "@/modules/expenses/types";
import { AttachmentList } from "@/modules/expenses/components/attachment-list";
import { type AttachmentFile } from "@/modules/expenses/components/attachment-upload";
import { useAttachments } from "@/modules/expenses/hooks/use-attachments";
import { Profile } from "@/modules/profile/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon } from "@/components/ui/icons";

interface MemberOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface AdminEditExpenseDialogProps {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminEditExpenseDialog({
  expenseId,
  open,
  onOpenChange,
  onSuccess,
}: AdminEditExpenseDialogProps) {
  const { data: identity } = useGetIdentity<Profile>();

  const [expense, setExpense] = useState<any>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [existingSplits, setExistingSplits] = useState<any[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadAttachments, deleteAttachment } = useAttachments();

  // Load expense data, splits, members, and attachments
  useEffect(() => {
    if (!expenseId || !open) {
      setExpense(null);
      setMembers([]);
      setExistingSplits([]);
      setExistingAttachments([]);
      setAttachments([]);
      return;
    }

    setLoading(true);

    // Fetch expense
    supabaseClient
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .single()
      .then(async ({ data: expenseData, error: expenseError }) => {
        if (expenseError || !expenseData) {
          toast.error("Không thể tải chi phí");
          setLoading(false);
          return;
        }

        setExpense(expenseData);

        // Fetch splits, members, and attachments in parallel
        const [splitsRes, attachmentsRes, membersRes] = await Promise.all([
          supabaseClient.rpc("get_expense_splits_public", {
            p_expense_id: expenseId,
          }),
          supabaseClient
            .from("attachments")
            .select("*")
            .eq("expense_id", expenseId),
          // Load members based on context
          expenseData.group_id
            ? supabaseClient
                .from("group_members")
                .select("*, profiles!user_id(id, full_name, avatar_url)")
                .eq("group_id", expenseData.group_id)
            : expenseData.friendship_id
            ? supabaseClient
                .from("friendships")
                .select(
                  "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)"
                )
                .eq("id", expenseData.friendship_id)
                .single()
            : Promise.resolve({ data: null, error: null }),
        ]);

        // Process splits
        if (splitsRes.data) {
          setExistingSplits(
            splitsRes.data.map((split: any) => ({
              id: split.id,
              expense_id: split.expense_id,
              user_id: split.user_id,
              split_method: split.split_method,
              split_value: split.split_value,
              computed_amount: split.computed_amount,
              is_settled: split.is_settled,
              settled_amount: split.settled_amount,
              settled_at: split.settled_at,
              created_at: split.created_at,
              profiles: {
                id: split.user_id,
                full_name: split.user_full_name,
                avatar_url: split.user_avatar_url,
              },
            }))
          );
        }

        // Process attachments
        if (attachmentsRes.data) {
          setExistingAttachments(attachmentsRes.data);
        }

        // Process members
        if (expenseData.group_id && membersRes.data) {
          const groupMembers = (membersRes.data as any[]).map((m: any) => ({
            id: m.profiles.id,
            full_name: m.profiles.full_name,
            avatar_url: m.profiles.avatar_url || null,
          }));
          setMembers(groupMembers);
        } else if (expenseData.friendship_id && membersRes.data) {
          const friendship = membersRes.data as any;
          const friendMembers = [
            {
              id: friendship.user_a_profile?.id ?? friendship.user_a,
              full_name: friendship.user_a_profile?.full_name ?? "User A",
              avatar_url: friendship.user_a_profile?.avatar_url || null,
            },
            {
              id: friendship.user_b_profile?.id ?? friendship.user_b,
              full_name: friendship.user_b_profile?.full_name ?? "User B",
              avatar_url: friendship.user_b_profile?.avatar_url || null,
            },
          ];
          setMembers(friendMembers);
        }

        setLoading(false);
      });
  }, [expenseId, open]);

  const handleSubmit = useCallback(
    async (values: ExpenseFormValues) => {
      if (!expenseId || !identity?.id) return;
      setIsSubmitting(true);

      try {
        const {
          splits,
          is_recurring,
          recurring,
          split_method,
          context_type,
          group_id,
          friendship_id,
          is_loan,
          ...expenseData
        } = values;

        // Update expense
        const { error: updateError } = await supabaseClient
          .from("expenses")
          .update(expenseData)
          .eq("id", expenseId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Delete existing splits and recreate (same as Client edit flow)
        await supabaseClient
          .from("expense_splits")
          .delete()
          .eq("expense_id", expenseId);

        // Create new splits, preserving settlement status
        const splitPromises = splits.map((split) => {
          const existingSplit = existingSplits.find(
            (es) => es.user_id === split.user_id
          );
          const isPayer = split.user_id === values.paid_by_user_id;

          let isSettled = false;
          let settledAmount = 0;
          let settledAt: string | null = null;

          if (isPayer) {
            isSettled = true;
            settledAmount = split.computed_amount;
            settledAt = new Date().toISOString();
          } else if (existingSplit) {
            isSettled = existingSplit.is_settled;
            settledAmount = existingSplit.settled_amount;
            settledAt = existingSplit.settled_at;
          }

          return supabaseClient.from("expense_splits").insert({
            expense_id: expenseId,
            user_id: split.user_id || null,
            pending_email: split.pending_email || null,
            split_method: values.split_method,
            split_value: split.split_value ?? null,
            computed_amount: split.computed_amount,
            is_settled: isSettled,
            settled_amount: settledAmount,
            settled_at: settledAt,
          });
        });

        const splitResults = await Promise.all(splitPromises);
        const splitErrors = splitResults.filter((r) => r.error);
        if (splitErrors.length > 0) {
          throw new Error(
            `Failed to update ${splitErrors.length} split(s): ${splitErrors[0].error?.message}`
          );
        }

        // Upload new attachments if any
        if (attachments.length > 0 && identity?.id) {
          const files = attachments.map((a) => a.file);
          await uploadAttachments(files, expenseId, identity.id);
        }

        toast.success("Đã cập nhật chi phí thành công");
        onOpenChange(false);
        onSuccess();
      } catch (err: any) {
        toast.error(`Lỗi: ${err.message ?? "Không thể cập nhật chi phí"}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      expenseId,
      identity,
      existingSplits,
      attachments,
      uploadAttachments,
      onOpenChange,
      onSuccess,
    ]
  );

  // Detect loan pattern (same as Client edit)
  const isExistingLoan = useMemo(() => {
    if (!expense || expense.context_type !== "friend" || existingSplits.length !== 2)
      return false;
    const payerSplit = existingSplits.find(
      (s: any) => s.user_id === expense.paid_by_user_id
    );
    const borrowerSplit = existingSplits.find(
      (s: any) => s.user_id !== expense.paid_by_user_id
    );
    if (!payerSplit || !borrowerSplit) return false;
    return (
      payerSplit.computed_amount === 0 &&
      Math.abs(borrowerSplit.computed_amount - expense.amount) < 1
    );
  }, [expense, existingSplits]);

  const defaultValues: Partial<ExpenseFormValues> | undefined = useMemo(() => {
    if (!expense || existingSplits.length === 0) return undefined;
    return {
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency || "VND",
      category: expense.category,
      expense_date: expense.expense_date,
      paid_by_user_id: expense.paid_by_user_id,
      split_method: isExistingLoan
        ? "exact"
        : existingSplits[0]?.split_method || "equal",
      comment: expense.comment || "",
      is_loan: isExistingLoan,
      splits: existingSplits.map((split: any) => ({
        user_id: split.user_id,
        split_value: split.split_value,
        computed_amount: split.computed_amount,
      })),
    };
  }, [expense, existingSplits, isExistingLoan]);

  const isReady = expense && members.length > 0 && existingSplits.length > 0 && defaultValues;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa chi phí (Admin)</DialogTitle>
          <DialogDescription>
            Cập nhật chi phí với đầy đủ tính năng như phía Client
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isReady ? (
          <div className="space-y-4 mt-2">
            {/* Context badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Admin
              </Badge>
              <span className="text-sm text-muted-foreground">
                {expense.context_type === "group" ? "Nhóm" : "Bạn bè"}
              </span>
            </div>

            <ExpenseForm
              groupId={expense.group_id || undefined}
              members={members}
              currentUserId={expense.paid_by_user_id}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              defaultValues={defaultValues}
              isEdit={true}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />

            {/* Existing attachments */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2 -mt-2">
                <h3 className="text-sm font-semibold">
                  Tệp đính kèm hiện có ({existingAttachments.length})
                </h3>
                <AttachmentList
                  attachments={existingAttachments}
                  canDelete={true}
                  onDelete={(attachmentId) => {
                    setExistingAttachments((prev) =>
                      prev.filter((a) => a.id !== attachmentId)
                    );
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Không thể tải dữ liệu chi phí
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
