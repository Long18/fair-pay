import { useGetIdentity, useList, useGo } from "@refinedev/core";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, PlusCircle } from "lucide-react";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";

export const ExpenseContextSelector = () => {
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const { data: groupsData, isLoading: loadingGroups } = useList({
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

  const { data: friendshipsData, isLoading: loadingFriendships } = useList<Friendship>({
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

  const groups = groupsData?.data?.map((m: any) => m.groups).filter(Boolean) || [];
  const friendships = friendshipsData?.data || [];

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
      <Dialog open onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p>Setting up expense form...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (groups.length === 0 && friendships.length === 0) {
    return (
      <Dialog open onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Get Started with Expenses</DialogTitle>
            <DialogDescription>
              To add an expense, you need to create a group or add a friend first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleCreateGroup}
              className="w-full justify-start"
              size="lg"
            >
              <Users className="mr-2 h-5 w-5" />
              Create a Group
            </Button>
            <Button
              onClick={handleViewFriends}
              variant="outline"
              className="w-full justify-start"
              size="lg"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Add a Friend
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Context</DialogTitle>
          <DialogDescription>
            Choose where to add this expense
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          {groups.map((group: any) => (
            <Button
              key={group.id}
              onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
              variant="outline"
              className="w-full justify-start"
              size="lg"
            >
              <Users className="mr-2 h-5 w-5" />
              {group.name}
            </Button>
          ))}
          {friendships.map((friendship: any) => {
            const isUserA = friendship.user_a_id === identity?.id;
            const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
            return (
              <Button
                key={friendship.id}
                onClick={() => go({ to: `/friends/${friendship.id}/expenses/create` })}
                variant="outline"
                className="w-full justify-start"
                size="lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {friendProfile?.full_name || "Friend"}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
