import { useEffect, useMemo } from "react";
import { useCreate, useGo, useGetIdentity, useList, useOne } from "@refinedev/core";
import { useParams, useSearchParams } from "react-router";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { PaymentForm } from "../components/payment-form";
import { PaymentFormValues } from "../types";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";
import { PaymentTracker, ErrorTracker } from "@/lib/analytics/index";
import { journeyTracking } from "@/lib/journey-tracking";

export const PaymentCreate = () => {
  const { groupId, friendshipId } = useParams<{ groupId?: string; friendshipId?: string }>();
  const [searchParams] = useSearchParams();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const createMutation = useCreate();

  const isGroupContext = !!groupId;
  const isFriendContext = !!friendshipId;

  useEffect(() => {
    journeyTracking.trackFormView("payment-create", isGroupContext ? "group-context" : "friend-context");
  }, [isGroupContext]);

  // Fetch group members if group context
  const { query: membersQuery } = useList({
    resource: "group_members",
    filters: [{ field: "group_id", operator: "eq", value: groupId }],
    pagination: {
      mode: "off", // Disable pagination to get all members
    },
    meta: {
      select: "*, profiles!user_id(*)",
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
      select: "*, user_a_profile:profiles!user_a(id, full_name), user_b_profile:profiles!user_b(id, full_name)",
    },
    queryOptions: {
      enabled: isFriendContext,
    },
  });

  const members = useMemo(() => {
    if (isGroupContext) {
      return (membersQuery.data?.data || []).map((m: any) => ({
        id: m.user_id,
        full_name: m.profiles?.full_name || "Unknown",
      }));
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

  const suggestedToUserId = searchParams.get("to_user") || searchParams.get("toUser") || undefined;
  const suggestedAmount = searchParams.get("amount")
    ? parseFloat(searchParams.get("amount")!)
    : undefined;

  const handleSubmit = (values: PaymentFormValues) => {
    const contextId = groupId || friendshipId;
    if (!contextId) return;
    journeyTracking.trackEvent({
      event_name: "form_submit",
      event_category: "payment",
      page_path: window.location.pathname,
      target_type: "form",
      target_key: "payment:create:submit",
      flow_name: "payment-create",
      step_name: isGroupContext ? "group-context" : "friend-context",
      properties: {
        context: isGroupContext ? "group" : "friend",
        amount: values.amount,
      },
    });

    const paymentData = {
      ...values,
      group_id: isGroupContext ? groupId : null,
      friendship_id: isFriendContext ? friendshipId : null,
      created_by: identity?.id,
    };

    createMutation.mutate(
      {
        resource: "payments",
        values: paymentData,
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded successfully");

          // Track payment creation
          PaymentTracker.recorded({
            amount: values.amount,
            currency: values.currency,
            paymentMethod: 'cash',
            hasProof: false,
            context: isGroupContext ? 'group' : 'friend',
          });
          journeyTracking.trackEvent({
            event_name: "form_success",
            event_category: "payment",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "payment:create:submit",
            flow_name: "payment-create",
            step_name: isGroupContext ? "group-context" : "friend-context",
            properties: {
              context: isGroupContext ? "group" : "friend",
            },
          });

          if (isGroupContext) {
            go({ to: `/groups/show/${groupId}` });
          } else if (isFriendContext) {
            go({ to: `/friends/show/${friendshipId}` });
          }
        },
        onError: (error) => {
          ErrorTracker.apiError({
            endpoint: 'payments',
            errorMessage: error.message,
          });
          journeyTracking.trackEvent({
            event_name: "form_error",
            event_category: "payment",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "payment:create:submit",
            flow_name: "payment-create",
            step_name: isGroupContext ? "group-context" : "friend-context",
            properties: {
              context: isGroupContext ? "group" : "friend",
              reason: "server_error",
            },
          });
          toast.error(`Failed to record payment: ${error.message}`);
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
  const isLoading = isGroupContext ? membersQuery.isLoading : friendshipQuery.isLoading;

  if (!identity || !contextId || isLoading || members.length === 0) {
    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleClose}
        title="Loading..."
        className="max-w-md"
      >
        <div className="py-8 text-center">
          <p>Loading payment form...</p>
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={handleClose}
      title="Record Payment"
      className="max-w-md"
    >
      <PaymentForm
        fromUserId={identity.id}
        fromUserName={identity.full_name}
        members={members}
        suggestedAmount={suggestedAmount}
        suggestedToUserId={suggestedToUserId}
        onSubmit={handleSubmit}
        isLoading={false}
      />
    </ResponsiveDialog>
  );
};
