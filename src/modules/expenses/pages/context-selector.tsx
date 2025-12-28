import { useGetIdentity, useList, useGo } from "@refinedev/core";
import { useEffect } from "react";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";

import { UsersIcon, UserPlusIcon, PlusCircleIcon } from "@/components/ui/icons";
export const ExpenseContextSelector = () => {
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const { query: groupsQuery } = useList({
    resource: "group_members",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    meta: {
      select: "*, groups!group_id(id, name, created_at)",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const { query: friendshipsQuery } = useList<Friendship>({
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
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const groups = groupsQuery.data?.data?.map((m: any) => m.groups).filter(Boolean) || [];
  const friendships = friendshipsQuery.data?.data || [];
  const loadingGroups = groupsQuery.isLoading;
  const loadingFriendships = friendshipsQuery.isLoading;

  useEffect(() => {
    if (!identity) return;
    if (loadingGroups || loadingFriendships) return;

    if (groups.length === 1 && friendships.length === 0) {
      const groupId = groups[0].id;
      go({ to: `/groups/${groupId}/expenses/create`, type: "replace" });
    } else if (friendships.length === 1 && groups.length === 0) {
      const friendshipId = friendships[0].id;
      go({ to: `/friends/${friendshipId}/expenses/create`, type: "replace" });
    } else if (groups.length > 0) {
      const mostRecentGroup = [...groups].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      go({ to: `/groups/${mostRecentGroup.id}/expenses/create`, type: "replace" });
    } else if (friendships.length > 0) {
      const friendshipId = friendships[0].id;
      go({ to: `/friends/${friendshipId}/expenses/create`, type: "replace" });
    }
  }, [identity, groups.length, friendships.length, loadingGroups, loadingFriendships, go]);

  const handleClose = () => {
    go({ to: "/" });
  };

  const handleCreateGroup = () => {
    go({ to: "/groups/create" });
  };

  const handleViewFriends = () => {
    go({ to: "/friends" });
  };

  if (!identity || loadingGroups || loadingFriendships) {
    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleClose}
        title="Loading..."
      >
        <div className="py-8 text-center">
          <p>Setting up expense form...</p>
        </div>
      </ResponsiveDialog>
    );
  }

  if (groups.length === 0 && friendships.length === 0) {
    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleClose}
        title="Create Your First Group or Add a Friend"
        description="Expenses in FairPay are shared with groups or friends. Let's get you started!"
        className="max-w-md"
      >
        <div className="space-y-4 pt-4">
          <div className="space-y-3">
            <Button
              onClick={handleCreateGroup}
              className="w-full justify-start h-auto py-4"
              size="lg"
            >
              <UsersIcon className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Create a Group</div>
                <div className="text-xs opacity-90">Split expenses with multiple people</div>
              </div>
            </Button>
            <Button
              onClick={handleViewFriends}
              variant="outline"
              className="w-full justify-start h-auto py-4"
              size="lg"
            >
              <UserPlusIcon className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Add a Friend</div>
                <div className="text-xs opacity-90">Share expenses one-on-one</div>
              </div>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center pt-2">
            💡 Tip: Groups are great for roommates, trips, or events
          </div>
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={handleClose}
      title="Where would you like to add this expense?"
      description="Select the group or friend to share this expense with"
    >
      <div className="space-y-2 pt-4">
        {groups.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-1">Groups</p>
            {groups.map((group: any) => (
              <Button
                key={group.id}
                onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
                variant="outline"
                className="w-full justify-start h-auto py-3"
                size="lg"
              >
                <UsersIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{group.name}</span>
              </Button>
            ))}
          </div>
        )}
        {friendships.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-muted-foreground px-1">Friends</p>
            {friendships.map((friendship: any) => {
              const isUserA = friendship.user_a_id === identity?.id;
              const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
              return (
                <Button
                  key={friendship.id}
                  onClick={() => go({ to: `/friends/${friendship.id}/expenses/create` })}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  size="lg"
                >
                  <UserPlusIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{friendProfile?.full_name || "Friend"}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};
