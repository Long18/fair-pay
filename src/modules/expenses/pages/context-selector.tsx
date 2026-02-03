import { useGetIdentity, useList, useGo } from "@refinedev/core";
import { useEffect, useMemo, useState } from "react";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";

import { UsersIcon, UserPlusIcon, PlusCircleIcon } from "@/components/ui/icons";
export const ExpenseContextSelector = () => {
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [groupSearch, setGroupSearch] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [groupPage, setGroupPage] = useState(1);
  const [friendPage, setFriendPage] = useState(1);
  const pageSize = 5;

  const { query: groupsQuery } = useList({
    resource: "group_members",
    pagination: { mode: "off" },
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
    pagination: { mode: "off" },
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

  const normalizedGroupSearch = groupSearch.trim().toLowerCase();
  const normalizedFriendSearch = friendSearch.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedGroupSearch) return groups;
    return groups.filter((group: any) => group?.name?.toLowerCase().includes(normalizedGroupSearch));
  }, [groups, normalizedGroupSearch]);

  const filteredFriendships = useMemo(() => {
    if (!normalizedFriendSearch) return friendships;
    return friendships.filter((friendship: any) => {
      const userAId = friendship.user_a || friendship.user_a_id;
      const userBId = friendship.user_b || friendship.user_b_id;
      const isUserA = userAId === identity?.id;
      const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
      const friendName = friendProfile?.full_name || "Friend";
      return friendName.toLowerCase().includes(normalizedFriendSearch);
    });
  }, [friendships, identity?.id, normalizedFriendSearch]);

  const groupTotalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const friendTotalPages = Math.max(1, Math.ceil(filteredFriendships.length / pageSize));

  useEffect(() => {
    setGroupPage(1);
  }, [normalizedGroupSearch]);

  useEffect(() => {
    setFriendPage(1);
  }, [normalizedFriendSearch]);

  useEffect(() => {
    if (groupPage > groupTotalPages) {
      setGroupPage(1);
    }
  }, [groupPage, groupTotalPages]);

  useEffect(() => {
    if (friendPage > friendTotalPages) {
      setFriendPage(1);
    }
  }, [friendPage, friendTotalPages]);

  const groupPaginationMetadata: PaginationMetadata = {
    totalItems: filteredGroups.length,
    totalPages: groupTotalPages,
    currentPage: groupPage,
    pageSize,
  };

  const friendPaginationMetadata: PaginationMetadata = {
    totalItems: filteredFriendships.length,
    totalPages: friendTotalPages,
    currentPage: friendPage,
    pageSize,
  };

  const pagedGroups = filteredGroups.slice((groupPage - 1) * pageSize, groupPage * pageSize);
  const pagedFriendships = filteredFriendships.slice((friendPage - 1) * pageSize, friendPage * pageSize);

  useEffect(() => {
    if (!identity) return;
    if (loadingGroups || loadingFriendships) return;

    // Only auto-redirect for simple cases (single option)
    // For multiple options, show the selection dialog
    if (groups.length === 1 && friendships.length === 0) {
      const groupId = groups[0].id;
      go({ to: `/groups/${groupId}/expenses/create`, type: "replace" });
    } else if (friendships.length === 1 && groups.length === 0) {
      const friendshipId = friendships[0].id;
      go({ to: `/friends/${friendshipId}/expenses/create`, type: "replace" });
    }
    // For multiple groups OR friendships, show selection dialog (no auto-redirect)
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
            <Input
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
              placeholder="Search groups"
            />
            {pagedGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No groups match your search.</p>
            ) : (
              pagedGroups.map((group: any) => (
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
              ))
            )}
            {filteredGroups.length > pageSize && (
              <PaginationControls
                metadata={groupPaginationMetadata}
                onPageChange={setGroupPage}
                className="pt-2"
              />
            )}
          </div>
        )}
        {friendships.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-muted-foreground px-1">Friends</p>
            <Input
              value={friendSearch}
              onChange={(event) => setFriendSearch(event.target.value)}
              placeholder="Search friends"
            />
            {pagedFriendships.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No friends match your search.</p>
            ) : (
              pagedFriendships.map((friendship: any) => {
                const userAId = friendship.user_a || friendship.user_a_id;
                const userBId = friendship.user_b || friendship.user_b_id;
                const isUserA = userAId === identity?.id;
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
              })
            )}
            {filteredFriendships.length > pageSize && (
              <PaginationControls
                metadata={friendPaginationMetadata}
                onPageChange={setFriendPage}
                className="pt-2"
              />
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};
