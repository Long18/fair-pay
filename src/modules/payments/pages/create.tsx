import { useEffect, useMemo } from "react";
import { useCreate, useGo, useGetIdentity, useList, useOne } from "@refinedev/core";
import { useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { PaymentForm } from "../components/payment-form";
import { PaymentFormValues } from "../types";
import { Profile } from "@/modules/profile/types";
import { Friendship, FriendshipWithProfiles } from "@/modules/friends/types";
import { Group } from "@/modules/groups/types";
import { toast } from "sonner";
import { PaymentTracker, ErrorTracker } from "@/lib/analytics/index";
import { journeyTracking } from "@/lib/journey-tracking";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsersIcon, UserIcon, ChevronRightIcon, Loader2Icon, AlertCircleIcon } from "@/components/ui/icons";

interface GroupMemberWithProfile {
  user_id: string;
  profiles?: Pick<Profile, "full_name"> | null;
}

interface FriendshipContextRecord extends FriendshipWithProfiles {
  user_a_id?: string;
  user_b_id?: string;
}

export const PaymentCreate = () => {
  const { groupId, friendshipId } = useParams<{ groupId?: string; friendshipId?: string }>();
  const [searchParams] = useSearchParams();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();

  const createMutation = useCreate();

  const isGroupContext = !!groupId;
  const isFriendContext = !!friendshipId;
  const isNoContext = !isGroupContext && !isFriendContext;

  // Fetch groups and friendships when no context is provided
  const { query: groupsQuery } = useList<Group>({
    resource: "groups",
    pagination: { mode: "off" },
    queryOptions: { enabled: isNoContext },
  });

  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: [{ field: "status", operator: "eq", value: "accepted" }],
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    pagination: { mode: "off" },
    queryOptions: { enabled: isNoContext },
  });

  useEffect(() => {
    if (groupsQuery.isError) toast.error(t("payments.errorLoadingGroups", "Failed to load groups"));
    if (friendshipsQuery.isError) toast.error(t("payments.errorLoadingFriends", "Failed to load friends"));
  }, [groupsQuery.isError, friendshipsQuery.isError, t]);

  useEffect(() => {
    const stepName = isGroupContext ? "group-context" : isFriendContext ? "friend-context" : "context-select";
    journeyTracking.trackFormView("payment-create", stepName);
  }, [isFriendContext, isGroupContext]);

  // Fetch group members if group context
  const { query: membersQuery } = useList<GroupMemberWithProfile>({
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
      return (membersQuery.data?.data || []).map((member) => ({
        id: member.user_id,
        full_name: member.profiles?.full_name || "Unknown",
      }));
    }

    if (isFriendContext && friendshipQuery.data?.data) {
      const friendship = friendshipQuery.data.data as FriendshipContextRecord;
      const isUserA = friendship.user_a_id === identity?.id;
      const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
      const friendId = isUserA ? (friendship.user_b_id ?? friendship.user_b) : (friendship.user_a_id ?? friendship.user_a);

      return [
        {
          id: identity!.id,
          full_name: "You",
        },
        {
          id: friendId,
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

  // Context selector: show when no groupId or friendshipId in params
  if (isNoContext) {
    const isLoadingContext = groupsQuery.isLoading || friendshipsQuery.isLoading;
    const groups = groupsQuery.data?.data || [];
    const friendships = friendshipsQuery.data?.data || [];

    const friendItems = friendships.map((friendship) => {
      const friendshipRecord = friendship as FriendshipContextRecord;
      const isUserA = friendshipRecord.user_a === identity?.id || friendshipRecord.user_a_id === identity?.id;
      const friendProfile = isUserA ? friendshipRecord.user_b_profile : friendshipRecord.user_a_profile;
      return {
        id: friendshipRecord.id,
        name: friendProfile?.full_name || t("payments.unknownFriend", "Friend"),
        avatar_url: friendProfile?.avatar_url || null,
      };
    });

    const handleSelectGroup = (id: string) => {
      go({ to: `/groups/${id}/payments/create`, query: Object.fromEntries(searchParams) });
    };
    const handleSelectFriend = (id: string) => {
      go({ to: `/friends/${id}/payments/create`, query: Object.fromEntries(searchParams) });
    };
    const handleCloseNoContext = () => {
      go({ to: "/" });
    };

    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleCloseNoContext}
        title={t("payments.settleUp", "Settle Up")}
        className="max-w-md"
      >
        <div className="py-2">
          {isLoadingContext ? (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon size={28} className="animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 && friendItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <AlertCircleIcon size={32} />
              <p className="text-sm">{t("payments.noContextEmpty", "Add a group or friend first to settle up")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.length > 0 && (
                <div>
                  <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("payments.groups", "Groups")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {groups.map((group: Group) => (
                      <Button
                        key={group.id}
                        variant="ghost"
                        className="flex h-auto w-full items-center justify-between rounded-lg px-3 py-2 text-left"
                        onClick={() => handleSelectGroup(group.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <UsersIcon size={16} className="text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">{group.name}</span>
                        </div>
                        <ChevronRightIcon size={16} className="text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {friendItems.length > 0 && (
                <div>
                  <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("payments.friends", "Friends")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {friendItems.map((friend) => (
                      <Button
                        key={friend.id}
                        variant="ghost"
                        className="flex h-auto w-full items-center justify-between rounded-lg px-3 py-2 text-left"
                        onClick={() => handleSelectFriend(friend.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback>
                              <UserIcon size={14} />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{friend.name}</span>
                        </div>
                        <ChevronRightIcon size={16} className="text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ResponsiveDialog>
    );
  }

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
