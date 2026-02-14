import { useOne, useUpdate, useList, useGo, useGetIdentity } from "@refinedev/core";
import { useState, useMemo } from "react";
import { useParams } from "react-router";
import { GroupForm } from "../components/group-form";
import { Group, GroupMember, GroupFormValues } from "../types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftIcon } from "@/components/ui/icons";
import type { Profile } from "@/modules/profile/types";

export const GroupEdit = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { query: groupQuery } = useOne<Group>({
    resource: "groups",
    id: id!,
    meta: { select: "*" },
  });

  // Fetch current group members with profiles
  const { query: membersQuery } = useList<GroupMember>({
    resource: "group_members",
    filters: [{ field: "group_id", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!id },
    meta: { select: "*, profiles!user_id(id, full_name, avatar_url)" },
  });

  // Fetch friends for adding new members
  const { query: friendsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: [{ field: "status", operator: "eq", value: "accepted" }],
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    pagination: { mode: "off" },
    queryOptions: { enabled: !!identity?.id },
  });

  const updateMutation = useUpdate();
  const { data, isLoading: isLoadingGroup } = groupQuery;
  const group = data?.data;

  // Build current members list from group_members query
  const currentMembers = useMemo(() => {
    if (!membersQuery.data?.data) return [];
    return membersQuery.data.data.map((m: any) => ({
      id: m.user_id,
      full_name: m.profiles?.full_name || "Unknown",
      avatar_url: m.profiles?.avatar_url || null,
      role: m.role as "admin" | "member",
    }));
  }, [membersQuery.data]);

  // Build available members: friends + current members (deduplicated)
  const availableMembers = useMemo(() => {
    if (!identity?.id) return currentMembers;

    const memberMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();

    // Add current group members first
    for (const m of currentMembers) {
      if (m.id !== identity.id) {
        memberMap.set(m.id, m);
      }
    }

    // Add friends
    if (friendsQuery.data?.data) {
      for (const friendship of friendsQuery.data.data as any[]) {
        const isUserA = friendship.user_a === identity.id;
        const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
        const friendId = isUserA ? friendship.user_b : friendship.user_a;

        if (friendId !== identity.id && !memberMap.has(friendId)) {
          memberMap.set(friendId, {
            id: friendId,
            full_name: friendProfile?.full_name || "Friend",
            avatar_url: friendProfile?.avatar_url || null,
          });
        }
      }
    }

    return Array.from(memberMap.values());
  }, [identity, currentMembers, friendsQuery.data]);

  // Current member IDs (excluding current user who is auto-added)
  const currentMemberIds = useMemo(() => {
    if (!identity?.id) return [];
    return currentMembers.filter((m) => m.id !== identity.id).map((m) => m.id);
  }, [currentMembers, identity]);

  const handleSubmit = (values: GroupFormValues) => {
    if (!group?.id) {
      toast.error("Group not found");
      return;
    }

    setIsSubmitting(true);
    const { member_ids, ...groupData } = values;
    updateMutation.mutate(
      {
        resource: "groups",
        id: group.id,
        values: groupData,
      },
      {
        onSuccess: () => {
          toast.success("Group updated successfully");
          go({ to: `/groups/show/${group.id}` });
        },
        onError: (error) => {
          toast.error(`Failed to update group: ${error.message}`);
          setIsSubmitting(false);
        },
      }
    );
  };

  if (isLoadingGroup) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="text-center py-16 space-y-3">
          <p className="text-lg font-medium text-muted-foreground">Group not found</p>
          <Button variant="outline" onClick={() => go({ to: "/groups" })}>
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => go({ to: `/groups/show/${group.id}` })}
          aria-label="Back to group"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Edit Group</h1>
          <p className="text-sm text-muted-foreground">
            Update {group.name}
          </p>
        </div>
      </div>

      <GroupForm
        onSubmit={handleSubmit}
        defaultValues={{
          name: group.name,
          description: group.description || "",
          simplify_debts: group.simplify_debts,
          avatar_url: group.avatar_url || "",
          member_ids: currentMemberIds,
        }}
        isLoading={isSubmitting}
        availableMembers={availableMembers}
        existingMembers={currentMembers}
        currentUserId={identity?.id}
      />
    </div>
  );
};
