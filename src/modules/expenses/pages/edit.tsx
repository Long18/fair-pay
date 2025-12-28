import { useState, useMemo, useEffect } from "react";
import { useUpdate, useGo, useList, useGetIdentity, useOne } from "@refinedev/core";
import { useParams } from "react-router";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { ExpenseForm } from "../components/expense-form";
import { AttachmentUpload, type AttachmentFile } from "../components/attachment-upload";
import { useAttachments } from "../hooks/use-attachments";
import { ExpenseFormValues, Expense } from "../types";
import { Profile } from "@/modules/profile/types";
import { GroupMember } from "@/modules/groups/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";

export const ExpenseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [existingSplits, setExistingSplits] = useState<any[]>([]);
  const { uploadAttachments } = useAttachments();

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

  // Fetch existing splits
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

  const updateMutation = useUpdate();

  // Determine members based on context
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

          // Create new splits
          const splitPromises = splits.map((split) =>
            supabaseClient
              .from("expense_splits")
              .insert({
                expense_id: id!,
                user_id: split.user_id,
                split_method: values.split_method,
                split_value: split.split_value,
                computed_amount: split.computed_amount,
              })
          );

          await Promise.all(splitPromises);

          // Upload new attachments if any
          if (attachments.length > 0 && identity?.id) {
            const files = attachments.map(a => a.file);
            await uploadAttachments(files, id!, identity.id);
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
    is_recurring: false,
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
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6">
        <ExpenseForm
          groupId={contextId!}
          members={members}
          currentUserId={identity.id}
          onSubmit={handleSubmit}
          isLoading={false}
          defaultValues={defaultValues}
        />

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-4">Add More Receipts (Optional)</h3>
          <AttachmentUpload
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
};
