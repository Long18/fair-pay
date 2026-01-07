import { useState, useMemo, useEffect } from "react";
import { useUpdate, useGo, useList, useGetIdentity, useOne } from "@refinedev/core";
import { useParams } from "react-router";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { ExpenseForm } from "../components/expense-form";
import { AttachmentUpload, type AttachmentFile } from "../components/attachment-upload";
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
import { Separator } from "@/components/ui/separator";

export const ExpenseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [existingSplits, setExistingSplits] = useState<any[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [recurringExpense, setRecurringExpense] = useState<RecurringExpense | null>(null);
  const { uploadAttachments, deleteAttachment } = useAttachments();
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
  const contextId = expense?.group_id || expense?.friendship_id;

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
      select: "*, profiles!user_id(id, full_name)",
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
      select: "*, user_a_profile:profiles!user_a(id, full_name), user_b_profile:profiles!user_b(id, full_name)",
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
      select: "*, user_a_profile:profiles!user_a(id, full_name), user_b_profile:profiles!user_b(id, full_name)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const updateMutation = useUpdate();

  // Determine members based on context (group members or friendship participants)
  const members = useMemo(() => {
    if (isGroupContext) {
      return membersQuery.data?.data?.map((m: any) => ({
        id: m.profiles.id,
        full_name: m.profiles.full_name,
      })) || [];
    }

    if (isFriendContext && friendshipQuery.data?.data) {
      const friendship: any = friendshipQuery.data.data;
      const isUserA = friendship.user_a_id === identity?.id;
      const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;

      return [
        {
          id: identity!.id,
          full_name: "You",
        },
        {
          id: isUserA ? friendship.user_b_id : friendship.user_a_id,
          full_name: friendProfile?.full_name || "Friend",
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
        const isUserA = friendship.user_a_id === identity.id;
        const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
        const friendId = isUserA ? friendship.user_b_id : friendship.user_a_id;

        return {
          id: friendId,
          full_name: friendProfile?.full_name || "Friend",
        };
      })
      .filter((friend) => friend.id !== undefined && friend.id !== null); // Filter out invalid friends
  }, [allFriendsQuery.data, identity]);

  // Combine members + friends for group context (remove duplicates)
  const allAvailableMembers = useMemo(() => {
    const seenIds = new Set<string>();
    const combined: { id: string; full_name: string }[] = [];

    if (isGroupContext) {
      // Add all group members first
      members.forEach(m => {
        if (m.id && !seenIds.has(m.id)) {
          combined.push(m);
          seenIds.add(m.id);
        }
      });

      // Add friends who are not already in the group
      allFriends.forEach(f => {
        if (f.id && !seenIds.has(f.id)) {
          combined.push(f);
          seenIds.add(f.id);
        }
      });

      return combined;
    }

    // In friend context: just the 2 people in the friendship (filter out invalid)
    return members.filter(m => m.id !== undefined && m.id !== null);
  }, [isGroupContext, members, allFriends]);

  const handleSubmit = async (values: ExpenseFormValues) => {
    const { splits, is_recurring, recurring, split_method, ...expenseData } = values;

    updateMutation.mutate(
      {
        resource: "expenses",
        id: id!,
        values: expenseData,
      },
      {
        onSuccess: async () => {
          // Delete existing splits
          await supabaseClient
            .from("expense_splits")
            .delete()
            .eq("expense_id", id!);

          // Create new splits, preserving settlement status for existing participants
          const splitPromises = splits.map((split) => {
            // Find if this user had a split before (to preserve settlement status)
            const existingSplit = existingSplits.find(es => es.user_id === split.user_id);
            const isPayer = split.user_id === values.paid_by_user_id;

            // Determine settlement status
            let isSettled = false;
            let settledAmount = 0;
            let settledAt = null;

            if (isPayer) {
              // Auto-settle the payer's own split
              isSettled = true;
              settledAmount = split.computed_amount;
              settledAt = new Date().toISOString();
            } else if (existingSplit) {
              // Preserve existing settlement status for non-payers
              isSettled = existingSplit.is_settled;
              settledAmount = existingSplit.settled_amount;
              settledAt = existingSplit.settled_at;
            }

            return supabaseClient
              .from("expense_splits")
              .insert({
                expense_id: id!,
                user_id: split.user_id,
                split_method: values.split_method,
                split_value: split.split_value,
                computed_amount: split.computed_amount,
                is_settled: isSettled,
                settled_amount: settledAmount,
                settled_at: settledAt,
              });
          });

          await Promise.all(splitPromises);

          // Upload new attachments if any
          if (attachments.length > 0 && identity?.id) {
            const files = attachments.map(a => a.file);
            await uploadAttachments(files, id!, identity.id);
          }

          // Handle recurring expense updates
          try {
            if (is_recurring && recurring) {
              if (recurringExpense) {
                // Update existing recurring expense
                await updateRecurring(recurringExpense.id, {
                  frequency: recurring.frequency,
                  interval: recurring.interval,
                  end_date: recurring.end_date,
                });
              } else {
                // Create new recurring expense
                await supabaseClient
                  .from("recurring_expenses")
                  .insert({
                    template_expense_id: id!,
                    frequency: recurring.frequency,
                    interval: recurring.interval,
                    next_occurrence: recurring.start_date.toISOString().split('T')[0],
                    end_date: recurring.end_date ? recurring.end_date.toISOString().split('T')[0] : null,
                    is_active: true,
                  });
              }
            } else if (!is_recurring && recurringExpense) {
              // Delete recurring expense if toggled off
              await deleteRecurring(recurringExpense.id);
            }
          } catch (error) {
            console.error("Error handling recurring expense:", error);
            toast.error("Expense updated but failed to update recurring schedule");
          }

          toast.success("Expense updated successfully");

          // Navigate back to expense detail
          go({ to: `/expenses/show/${id}` });
        },
        onError: (error) => {
          toast.error(`Failed to update expense: ${error.message}`);
        },
      }
    );
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

  // Prepare initial values for form
  const defaultValues: Partial<ExpenseFormValues> = {
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency || "VND",
    category: expense.category,
    expense_date: expense.expense_date,
    paid_by_user_id: expense.paid_by_user_id,
    split_method: existingSplits[0]?.split_method || "equal",
    comment: expense.comment || "",
    is_recurring: !!recurringExpense,
    recurring: recurringExpense ? {
      frequency: recurringExpense.frequency as any,
      interval: recurringExpense.interval,
      start_date: new Date(recurringExpense.next_occurrence),
      end_date: recurringExpense.end_date ? new Date(recurringExpense.end_date) : null,
      notify_before_days: 0, // Default value
    } : undefined,
    splits: existingSplits.map((split: any) => ({
      user_id: split.user_id,
      split_value: split.split_value,
      computed_amount: split.computed_amount,
    })),
  };

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={handleClose}
      title="Edit Expense"
      className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6">
        <ExpenseForm
          groupId={contextId!}
          members={allAvailableMembers}
          currentUserId={identity.id}
          onSubmit={handleSubmit}
          isLoading={false}
          defaultValues={defaultValues}
          isEdit={true}
        />

        {/* Receipts & Bills Section - Grouped with Comment */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Receipts & Bills</h3>
            <p className="text-xs text-muted-foreground mb-4">Attach receipts or bills for this expense (Optional)</p>

            {/* Existing Receipts */}
            {existingAttachments.length > 0 && (
              <div className="space-y-4 mb-4">
                <h4 className="text-xs font-medium text-muted-foreground">Existing Receipts ({existingAttachments.length})</h4>
                <AttachmentList
                  attachments={existingAttachments}
                  canDelete={true}
                  onDelete={(attachmentId) => {
                    setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
                  }}
                />
              </div>
            )}

            {/* Add New Receipts */}
            <div className="space-y-2">
              {existingAttachments.length > 0 && (
                <h4 className="text-xs font-medium text-muted-foreground">Add More Receipts</h4>
              )}
              <AttachmentUpload
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </div>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
