import { useState, useMemo } from "react";
import { useCreate, useGo, useList, useGetIdentity, useOne } from "@refinedev/core";
import { useParams } from "react-router";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { ExpenseForm } from "../components/expense-form";
import { AttachmentUpload, type AttachmentFile } from "../components/attachment-upload";
import { useAttachments } from "../hooks/use-attachments";
import { useCreateRecurringExpense } from "../hooks/use-recurring-expenses";
import { useTopTransactionPartners } from "@/hooks/analytics/use-top-transaction-partners";
import { ExpenseFormValues } from "../types";
import { Profile } from "@/modules/profile/types";
import { GroupMember } from "@/modules/groups/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { ExpenseTracker, ErrorTracker } from "@/lib/analytics/index";

export const ExpenseCreate = () => {
  const { groupId, friendshipId } = useParams<{ groupId?: string; friendshipId?: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const { uploadAttachments } = useAttachments();
  const { createRecurring } = useCreateRecurringExpense();

  const isGroupContext = !!groupId;
  const isFriendContext = !!friendshipId;

  // Fetch top transaction partners (2-3 people with most transactions)
  const topPartnerIds = useTopTransactionPartners(
    identity?.id,
    isGroupContext ? "group" : "friend",
    isGroupContext ? groupId : friendshipId,
    3
  );

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
    id: friendshipId!,
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    queryOptions: {
      enabled: isFriendContext,
    },
  });

  const createMutation = useCreate();

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

      // Use user_a/user_b (not user_a_id/user_b_id) - Supabase returns these fields
      const userAId = friendship.user_a || friendship.user_a_id;
      const userBId = friendship.user_b || friendship.user_b_id;
      const isUserA = userAId === identity?.id;
      const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
      const friendId = isUserA ? userBId : userAId;

      const friendMembers = [
        {
          id: identity!.id,
          full_name: "You",
          avatar_url: identity!.avatar_url || null,
        },
        {
          id: friendId,
          full_name: friendProfile?.full_name || "Friend",
          avatar_url: friendProfile?.avatar_url || null,
        },
      ].filter(m => m.id !== undefined && m.id !== null); // Ensure valid IDs

      // Debug: Log to catch duplicate IDs
      if (friendMembers.length < 2) {
        console.warn('[ExpenseCreate] Friend context members issue - only got', friendMembers.length, 'members');
      }

      return friendMembers;
    }

    return [];
  }, [isGroupContext, isFriendContext, membersQuery.data, friendshipQuery.data, identity]);

  // For group context: only group members. For friend context: the 2 people in the friendship.
  const availableMembers = useMemo(() => {
    if (isGroupContext) {
      // Only group members -- no friends added
      return members.filter(m => m.id !== undefined && m.id !== null);
    }

    // Friend context: just the 2 people in the friendship
    return members.filter(m => m.id !== undefined && m.id !== null);
  }, [isGroupContext, members]);

  const handleSubmit = async (values: ExpenseFormValues) => {
    const { splits, is_recurring, recurring, split_method, is_loan, ...expenseData } = values;

    // Add context type and IDs to expense data
    const expensePayload = {
      ...expenseData,
      context_type: isGroupContext ? 'group' : 'friend',
      group_id: isGroupContext ? groupId : null,
      friendship_id: isFriendContext ? friendshipId : null,
      created_by: identity!.id,
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
        onSuccess: async (data) => {
          const expenseId = data.data.id as string;

          // Create splits using Supabase client
          // Auto-mark the payer's split as fully settled
          try {
            // Filter out invalid splits (must have user_id or pending_email, and a computed_amount)
            const validSplits = splits.filter(split => {
              if (!split.user_id && !split.pending_email) {
                console.warn('Skipping split with neither user_id nor pending_email:', split);
                return false;
              }
              if (split.computed_amount === undefined || split.computed_amount === null) {
                console.warn('Skipping split with missing computed_amount:', split);
                return false;
              }
              return true;
            });

            if (validSplits.length === 0) {
              throw new Error('No valid splits to create. Please ensure all participants are selected.');
            }

            if (validSplits.length !== splits.length) {
              console.warn(`Filtered out ${splits.length - validSplits.length} invalid split(s)`);
            }

            const splitPromises = validSplits.map((split) => {
              const isPendingEmail = !!split.pending_email && !split.user_id;
              const isPayer = !!split.user_id && split.user_id === values.paid_by_user_id;
              return supabaseClient
                .from("expense_splits")
                .insert({
                  expense_id: expenseId,
                  user_id: split.user_id || null,
                  pending_email: split.pending_email || null,
                  split_method: values.split_method,
                  split_value: split.split_value ?? null,
                  computed_amount: split.computed_amount,
                  // Auto-settle only the payer's own split (not email-based participants)
                  is_settled: isPayer,
                  is_claimed: !isPendingEmail,
                  settled_amount: isPayer ? split.computed_amount : 0,
                  settled_at: isPayer ? new Date().toISOString() : null,
                });
            });

            const splitResults = await Promise.all(splitPromises);

            // Check for errors in split creation
            const splitErrors = splitResults.filter(r => r.error);
            if (splitErrors.length > 0) {
              console.error('Split creation errors:', splitErrors);
              throw new Error(`Failed to create ${splitErrors.length} split(s): ${splitErrors[0].error?.message || 'Unknown error'}`);
            }
          } catch (error) {
            console.error('Error creating expense splits:', error);
            ErrorTracker.apiError({
              endpoint: 'expense_splits',
              errorMessage: error instanceof Error ? error.message : 'Failed to create expense splits',
            });
            toast.error(`Failed to create expense splits: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // Re-throw to prevent further processing
          }

          // Upload attachments if any
          if (attachments.length > 0 && identity?.id) {
            const files = attachments.map(a => a.file);
            await uploadAttachments(files, expenseId, identity.id);
          }

          // Track expense creation
          ExpenseTracker.created({
            amount: values.amount,
            currency: values.currency,
            splitMethod: values.split_method,
            participantCount: splits.length,
            hasReceipt: attachments.length > 0,
            context: isGroupContext ? 'group' : 'friend',
          });

          // Create recurring expense if requested
          if (is_recurring && recurring) {
            try {
              const contextType = isGroupContext ? 'group' : 'friend';
              const contextId = groupId || friendshipId || '';
              await createRecurring(expenseId, recurring, contextType, contextId);
              toast.success("Expense and recurring schedule created successfully");
            } catch (error) {
              ErrorTracker.apiError({
                endpoint: 'recurring_expenses',
                errorMessage: error instanceof Error ? error.message : 'Failed to create recurring schedule',
              });
              toast.error("Expense created but failed to set up recurring schedule");
              console.error("Failed to create recurring expense:", error);
            }
          } else {
            toast.success("Expense created successfully");
          }

          // Navigate to the created expense to show details
          go({ to: `/expenses/show/${expenseId}` });
        },
        onError: (error) => {
          ErrorTracker.apiError({
            endpoint: 'expenses',
            errorMessage: error.message,
          });
          toast.error(`Failed to create expense: ${error.message}`);
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

  if (!contextId || !identity || availableMembers.length === 0) {
    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleClose}
        title="Loading..."
      >
        <div className="py-8 text-center">
          <p>Loading expense form...</p>
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={handleClose}
      title={isGroupContext ? "Add Group Expense" : "Add Expense with Friend"}
      className="sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
    >
      <ExpenseForm
        groupId={groupId}
        members={availableMembers}
        currentUserId={identity.id}
        onSubmit={handleSubmit}
        isLoading={false}
        topPartnerIds={topPartnerIds}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />
    </ResponsiveDialog>
  );
};
