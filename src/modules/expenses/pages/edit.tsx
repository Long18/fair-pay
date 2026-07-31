import { useState, useMemo, useEffect, useCallback } from "react";
import { useGo, useList, useGetIdentity, useOne } from "@refinedev/core";
import { useParams } from "react-router";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { ExpenseForm } from "../components/expense-form";
import { type AttachmentFile } from "../components/attachment-upload";
import { AttachmentList } from "../components/attachment-list";
import { useAttachments } from "../hooks/use-attachments";
import { useUpdateRecurringExpense, useDeleteRecurringExpense } from "../hooks/use-recurring-expenses";
import { ExpenseFormValues, Expense, Attachment } from "../types";
import { RecurringExpense } from "../types/recurring";
import { Profile } from "@/modules/profile/types";
import { GroupMember } from "@/modules/groups/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { useTrackEvent } from "@/hooks/use-track-event";

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ExpenseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [existingSplits, setExistingSplits] = useState<any[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [recurringExpense, setRecurringExpense] = useState<RecurringExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadAttachments, isUploading } = useAttachments();
  const { updateRecurring } = useUpdateRecurringExpense();
  const { deleteRecurring } = useDeleteRecurringExpense();

  // Fetch expense data
  const { query: expenseQuery } = useOne<Expense>({
    resource: "expenses",
    id: id!,
    meta: {
      select: "*, profiles!paid_by_user_id(id, full_name, avatar_url)",
    },
  });

  const expense: any = expenseQuery.data?.data;
  const isGroupContext = !!expense?.group_id;
  const isFriendContext = !!expense?.friendship_id;

  // Fetch existing splits (with settlement status)
  useEffect(() => {
    if (!id) return;

    supabaseClient
      .rpc("get_expense_splits_public", { p_expense_id: id })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching splits:", error);
          setExistingSplits([]);
        } else {
          const transformedSplits = (data || []).map((split: any) => ({
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
          }));
          setExistingSplits(transformedSplits);
        }
      });
  }, [id]);

  // Fetch existing attachments
  useEffect(() => {
    if (!id) return;

    supabaseClient
      .from("attachments")
      .select("*")
      .eq("expense_id", id)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching attachments:", error);
          setExistingAttachments([]);
        } else {
          setExistingAttachments(data || []);
        }
      });
  }, [id]);

  // Fetch recurring expense data if exists
  useEffect(() => {
    if (!id) return;

    supabaseClient
      .from("recurring_expenses")
      .select("*")
      .eq("template_expense_id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching recurring expense:", error);
          setRecurringExpense(null);
        } else {
          setRecurringExpense(data);
        }
      });
  }, [id]);

  // Fetch group members if group context
  const { query: membersQuery } = useList<GroupMember>({
    resource: "group_members",
    filters: [
      {
        field: "group_id",
        operator: "eq",
        value: expense?.group_id,
      },
    ],
    pagination: {
      mode: "off", // Disable pagination to get all members
    },
    meta: {
      select: "*, profiles!user_id(id, full_name, avatar_url)",
    },
    queryOptions: {
      enabled: isGroupContext,
    },
  });

  // Fetch friendship if friend context
  const { query: friendshipQuery } = useOne<Friendship>({
    resource: "friendships",
    id: expense?.friendship_id!,
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    queryOptions: {
      enabled: isFriendContext,
    },
  });

  // Fetch all user's friends (for adding to group expenses)
  const { query: allFriendsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: [
      {
        field: "status",
        operator: "eq",
        value: "accepted",
      },
    ],
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const { track } = useTrackEvent();

  const refreshExistingAttachments = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabaseClient
      .from("attachments")
      .select("*")
      .eq("expense_id", id);

    if (error) {
      console.error("Error fetching attachments:", error);
      return;
    }

    setExistingAttachments(data || []);
  }, [id]);

  const handleAttachmentsChange = useCallback(
    async (newAttachments: AttachmentFile[]) => {
      const previousFiles = new Set(attachments.map((attachment) => attachment.file));
      const newlyAdded = newAttachments.filter((attachment) => !previousFiles.has(attachment.file));
      setAttachments(newAttachments);

      if (newlyAdded.length === 0 || !identity?.id || !id) {
        return;
      }

      const uploaded = await uploadAttachments(
        newlyAdded.map((attachment) => attachment.file),
        id,
        identity.id,
      );

      await refreshExistingAttachments();

      if (uploaded.length === newlyAdded.length) {
        setAttachments((current) =>
          current.filter((attachment) => !newlyAdded.some((added) => added.file === attachment.file)),
        );
        return;
      }

      if (uploaded.length > 0) {
        toast.warning(
          `Uploaded ${uploaded.length} of ${newlyAdded.length} file(s). Failed files remain below — try again.`,
        );
        return;
      }

      toast.error("Failed to upload receipt. Check your connection and try again.");
    },
    [attachments, identity, id, uploadAttachments, refreshExistingAttachments],
  );

  // Determine members based on context (group members or friendship participants)
  const members = useMemo(() => {
    if (isGroupContext) {
      return membersQuery.data?.data?.map((m: any) => ({
        id: m.profiles.id,
        full_name: m.profiles.full_name,
        avatar_url: m.profiles.avatar_url || null,
      })) || [];
    }

    if (isFriendContext && friendshipQuery.data?.data) {
      const friendship: any = friendshipQuery.data.data;
      const userAId = friendship.user_a || friendship.user_a_id;
      const userBId = friendship.user_b || friendship.user_b_id;
      const isUserA = userAId === identity?.id;
      const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;

      return [
        {
          id: identity!.id,
          full_name: "You",
          avatar_url: identity!.avatar_url || null,
        },
        {
          id: isUserA ? userBId : userAId,
          full_name: friendProfile?.full_name || "Friend",
          avatar_url: friendProfile?.avatar_url || null,
        },
      ];
    }

    return [];
  }, [isGroupContext, isFriendContext, membersQuery.data, friendshipQuery.data, identity]);

  // Extract all friends from friendships (for adding to group expenses)
  const allFriends = useMemo(() => {
    if (!allFriendsQuery.data?.data || !identity?.id) return [];

    return allFriendsQuery.data.data
      .map((friendship: any) => {
        const userAId = friendship.user_a || friendship.user_a_id;
        const userBId = friendship.user_b || friendship.user_b_id;
        const isUserA = userAId === identity.id;
        const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
        const friendId = isUserA ? userBId : userAId;

        return {
          id: friendId,
          full_name: friendProfile?.full_name || "Friend",
          avatar_url: friendProfile?.avatar_url || null,
        };
      })
      .filter((friend) => friend.id !== undefined && friend.id !== null);
  }, [allFriendsQuery.data, identity]);

  // Combine members + friends for group context (remove duplicates)
  const allAvailableMembers = useMemo(() => {
    const seenIds = new Set<string>();
    const combined: { id: string; full_name: string; avatar_url?: string | null }[] = [];

    if (isGroupContext) {
      members.forEach(m => {
        if (m.id && !seenIds.has(m.id)) {
          combined.push(m);
          seenIds.add(m.id);
        }
      });

      allFriends.forEach(f => {
        if (f.id && !seenIds.has(f.id)) {
          combined.push(f);
          seenIds.add(f.id);
        }
      });

      return combined;
    }

    return members.filter(m => m.id !== undefined && m.id !== null);
  }, [isGroupContext, members, allFriends]);

  const handleSubmit = async (values: ExpenseFormValues) => {
    if (!id || !identity?.id) {
      toast.error("Missing expense context. Please reload and try again.");
      return;
    }

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

    setIsSubmitting(true);
    track({ eventName: "expense_edit_submitted", expenseId: id });

    try {
      const { error: expenseError } = await supabaseClient
        .from("expenses")
        .update({
          description: expenseData.description,
          amount: expenseData.amount,
          currency: expenseData.currency,
          category: expenseData.category || null,
          expense_date: expenseData.expense_date,
          paid_by_user_id: expenseData.paid_by_user_id,
          comment: expenseData.comment || null,
        })
        .eq("id", id);

      if (expenseError) {
        throw new Error(expenseError.message);
      }

      const { error: deleteSplitsError } = await supabaseClient
        .from("expense_splits")
        .delete()
        .eq("expense_id", id);

      if (deleteSplitsError) {
        throw new Error(deleteSplitsError.message);
      }

      const splitResults = await Promise.all(
        splits.map((split) => {
          const existingSplit = existingSplits.find((es) => es.user_id === split.user_id);
          const isPayer = split.user_id === values.paid_by_user_id;

          let isSettled = false;
          let settledAmount = 0;
          let settledAt = null;

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
            expense_id: id,
            user_id: split.user_id,
            split_method: values.split_method,
            split_value: split.split_value,
            computed_amount: split.computed_amount,
            is_settled: isSettled,
            settled_amount: settledAmount,
            settled_at: settledAt,
          });
        }),
      );

      const failedSplit = splitResults.find((result) => result.error);
      if (failedSplit?.error) {
        throw new Error(failedSplit.error.message);
      }

      if (attachments.length > 0) {
        const uploaded = await uploadAttachments(
          attachments.map((attachment) => attachment.file),
          id,
          identity.id,
        );
        if (uploaded.length > 0) {
          await refreshExistingAttachments();
          setAttachments([]);
        }
      }

      try {
        if (is_recurring && recurring) {
          if (recurringExpense) {
            await updateRecurring(recurringExpense.id, {
              frequency: recurring.frequency,
              interval: recurring.interval,
              end_date: recurring.end_date,
            });
          } else {
            const { error: recurringError } = await supabaseClient
              .from("recurring_expenses")
              .insert({
                template_expense_id: id,
                frequency: recurring.frequency,
                interval: recurring.interval,
                next_occurrence: recurring.start_date.toISOString().split("T")[0],
                end_date: recurring.end_date ? recurring.end_date.toISOString().split("T")[0] : null,
                is_active: true,
              });

            if (recurringError) {
              throw recurringError;
            }
          }
        } else if (!is_recurring && recurringExpense) {
          await deleteRecurring(recurringExpense.id);
        }
      } catch (error) {
        console.error("Error handling recurring expense:", error);
        toast.error("Expense updated but failed to update recurring schedule");
      }

      track({ eventName: "expense_edit_success", expenseId: id, resultStatus: "success" });
      toast.success("Expense updated successfully");
      go({ to: `/expenses/show/${id}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update expense";
      track({ eventName: "expense_edit_failed", expenseId: id, resultStatus: "failed" });
      toast.error(`Failed to update expense: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    go({ to: `/expenses/show/${id}` });
  };

  if (!expense || !identity || members.length === 0 || existingSplits.length === 0) {
    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleClose}
        title="Loading..."
      >
        <div className="py-8 text-center">
          <p>Loading expense data...</p>
        </div>
      </ResponsiveDialog>
    );
  }

  const isExistingLoan = (() => {
    if (expense.context_type !== "friend" || existingSplits.length !== 2) return false;
    const payerSplit = existingSplits.find((s: any) => s.user_id === expense.paid_by_user_id);
    const borrowerSplit = existingSplits.find((s: any) => s.user_id !== expense.paid_by_user_id);
    if (!payerSplit || !borrowerSplit) return false;
    return payerSplit.computed_amount === 0 && Math.abs(borrowerSplit.computed_amount - expense.amount) < 1;
  })();

  const defaultValues: Partial<ExpenseFormValues> = {
    description: expense.description,
    amount: toNumber(expense.amount),
    currency: expense.currency || "VND",
    category: expense.category,
    expense_date: expense.expense_date,
    paid_by_user_id: expense.paid_by_user_id,
    split_method: isExistingLoan ? "exact" : (existingSplits[0]?.split_method || "equal"),
    comment: expense.comment || "",
    is_loan: isExistingLoan,
    is_recurring: !!recurringExpense,
    recurring: recurringExpense ? {
      frequency: recurringExpense.frequency as any,
      interval: recurringExpense.interval,
      start_date: new Date(recurringExpense.next_occurrence),
      end_date: recurringExpense.end_date ? new Date(recurringExpense.end_date) : null,
      notify_before_days: 0,
    } : undefined,
    splits: existingSplits.map((split: any) => ({
      user_id: split.user_id,
      split_value: toNumber(split.split_value),
      computed_amount: toNumber(split.computed_amount),
    })),
  };

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={handleClose}
      title="Edit Expense"
      className="sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
    >
      <div className="space-y-6 overflow-x-hidden max-w-full">
        <ExpenseForm
          key={id}
          groupId={expense.group_id || undefined}
          members={allAvailableMembers}
          currentUserId={identity.id}
          onSubmit={handleSubmit}
          isLoading={isSubmitting || isUploading}
          defaultValues={defaultValues}
          isEdit={true}
          attachments={attachments}
          onAttachmentsChange={handleAttachmentsChange}
          attachmentUploadHint="Photos upload immediately when selected — no need to save the expense first."
          isAttachmentUploading={isUploading}
        />

        {existingAttachments.length > 0 && (
          <div className="space-y-4 -mt-2">
            <div>
              <h3 className="text-sm font-semibold mb-1">
                Existing Receipts ({existingAttachments.length})
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Previously uploaded receipts
              </p>
              <AttachmentList
                attachments={existingAttachments}
                canDelete={true}
                onDelete={(attachmentId) => {
                  setExistingAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
                }}
              />
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};
