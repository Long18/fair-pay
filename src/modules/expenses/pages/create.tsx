import { useState, useMemo } from "react";
import { useCreate, useGo, useList, useGetIdentity, useOne, useQueryClient } from "@refinedev/core";
import { useParams } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "../components/expense-form";
import { AttachmentUpload, type AttachmentFile } from "../components/attachment-upload";
import { useAttachments } from "../hooks/use-attachments";
import { useCreateRecurringExpense } from "../hooks/use-recurring-expenses";
import { ExpenseFormValues } from "../types";
import { Profile } from "@/modules/profile/types";
import { GroupMember } from "@/modules/groups/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";

export const ExpenseCreate = () => {
  const { groupId, friendshipId } = useParams<{ groupId?: string; friendshipId?: string }>();
  const go = useGo();
  const queryClient = useQueryClient();
  const { data: identity } = useGetIdentity<Profile>();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const { uploadAttachments } = useAttachments();
  const { createRecurring } = useCreateRecurringExpense();

  const isGroupContext = !!groupId;
  const isFriendContext = !!friendshipId;

  // Fetch group members if group context
  const { query: membersQuery } = useList<GroupMember>({
    resource: "group_members",
    filters: [
      {
        field: "group_id",
        operator: "eq",
        value: groupId,
      },
    ],
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
    id: friendshipId!,
    meta: {
      select: "*, user_a_profile!user_a(id, full_name), user_b_profile!user_b(id, full_name)",
    },
    queryOptions: {
      enabled: isFriendContext,
    },
  });

  const createMutation = useCreate();

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
    const { splits, is_recurring, recurring, ...expenseData } = values;

    // Add context type and IDs to expense data
    const expensePayload = {
      ...expenseData,
      context_type: isGroupContext ? 'group' : 'friend',
      group_id: isGroupContext ? groupId : null,
      friendship_id: isFriendContext ? friendshipId : null,
    };

    createMutation.mutate(
      {
        resource: "expenses",
        values: expensePayload,
        meta: {
          splits,
        },
      },
      {
        onMutate: async () => {
          // Cancel outgoing refetches
          await queryClient.cancelQueries({ queryKey: ["expenses"] });
          await queryClient.cancelQueries({ queryKey: ["balances"] });

          // Snapshot the previous value
          const previousExpenses = queryClient.getQueryData(["expenses"]);
          const previousBalances = queryClient.getQueryData(["balances", identity?.id]);

          // Optimistically show loading state
          toast.loading("Creating expense...", { id: "create-expense" });

          // Return context with previous values
          return { previousExpenses, previousBalances };
        },
        onSuccess: async (data) => {
          const expenseId = data.data.id as string;

          // Create splits
          const splitPromises = splits.map((split) =>
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/expense_splits`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                expense_id: expenseId,
                user_id: split.user_id,
                split_method: values.split_method,
                split_value: split.split_value,
                computed_amount: split.computed_amount,
              }),
            })
          );

          await Promise.all(splitPromises);

          // Upload attachments if any
          if (attachments.length > 0 && identity?.id) {
            const files = attachments.map(a => a.file);
            await uploadAttachments(files, expenseId, identity.id);
          }

          // Create recurring expense if requested
          if (is_recurring && recurring) {
            try {
              const contextType = isGroupContext ? 'group' : 'friend';
              const contextId = groupId || friendshipId || '';
              await createRecurring(expenseId, recurring, contextType, contextId);
              toast.success("Expense and recurring schedule created successfully");
            } catch (error) {
              toast.error("Expense created but failed to set up recurring schedule");
              console.error("Failed to create recurring expense:", error);
            }
          } else {
            toast.success("Expense created successfully", { id: "create-expense" });
          }

          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({ queryKey: ["balances", identity?.id] });
          queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
          if (groupId) {
            queryClient.invalidateQueries({ queryKey: ["groups", "show", groupId] });
          }
          if (friendshipId) {
            queryClient.invalidateQueries({ queryKey: ["friendships", "show", friendshipId] });
          }

          // Navigate back based on context
          if (isGroupContext) {
            go({ to: `/groups/show/${groupId}` });
          } else if (isFriendContext) {
            go({ to: `/friends/show/${friendshipId}` });
          }
        },
        onError: (error, _variables, context) => {
          // Rollback on error
          if (context?.previousExpenses) {
            queryClient.setQueryData(["expenses"], context.previousExpenses);
          }
          if (context?.previousBalances) {
            queryClient.setQueryData(["balances", identity?.id], context.previousBalances);
          }

          toast.error(`Failed to create expense: ${error.message}`, { id: "create-expense" });
        },
        onSettled: () => {
          // Always refetch after error or success
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({ queryKey: ["balances"] });
        },
      }
    );
  };

  const handleClose = () => {
    if (isGroupContext) {
      go({ to: `/groups/show/${groupId}` });
    } else if (isFriendContext) {
      go({ to: `/friends/show/${friendshipId}` });
    } else {
      go({ to: "/" });
    }
  };

  const contextId = groupId || friendshipId;

  if (!contextId || !identity || members.length === 0) {
    return (
      <Dialog open onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p>Loading expense form...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isGroupContext ? "Add Group Expense" : "Add Expense with Friend"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <ExpenseForm
            groupId={contextId}
            members={members}
            currentUserId={identity.id}
            onSubmit={handleSubmit}
            isLoading={false}
          />

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-4">Attach Receipts (Optional)</h3>
            <AttachmentUpload
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
