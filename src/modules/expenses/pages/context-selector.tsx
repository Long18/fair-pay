import { useGetIdentity, useList, useGo } from "@refinedev/core";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemGroup } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Profile } from "@/modules/profile/types";
import { FriendshipWithProfiles } from "@/modules/friends/types";
import { UsersIcon, UserPlusIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useRecentExpenseContexts } from "@/modules/expenses/hooks/use-recent-expense-contexts";
import { ContextItemRow } from "@/modules/expenses/components/context-item-row";
import { Search, X } from "lucide-react";

type ExpenseContextOption = {
  id: string;
  type: "group" | "friend";
  name: string;
  avatarUrl?: string;
  subtitle: string;
};

// Shapes for the Supabase group_members query with embedded group data
type MemberCountRow = { count: number };

type GroupData = {
  id: string;
  name: string;
  created_at: string;
  is_archived: boolean;
  created_by: string;
  member_count?: MemberCountRow[];
};

type GroupMemberRow = {
  groups: GroupData | null;
  role: string;
};

type GroupWithRole = GroupData & { _role: string };

const RECENT_MAX = 3;

export const ExpenseContextSelector = () => {
  const go = useGo();
  const [searchParams] = useSearchParams();
  const { tap } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const { recentAll, addRecent } = useRecentExpenseContexts(identity?.id);
  const [search, setSearch] = useState("");
  const [showAllRecents, setShowAllRecents] = useState(false);
  const requestedCounterpartyId =
    searchParams.get("with") || searchParams.get("friendId");

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
      select:
        "*, groups!group_id(id, name, created_at, is_archived, created_by, member_count:group_members!group_id(count)), role",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const { query: friendshipsQuery } = useList<FriendshipWithProfiles>({
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
      select:
        "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const groupMembersData = (groupsQuery.data?.data ?? []) as GroupMemberRow[];
  const groups: GroupWithRole[] = groupMembersData
    .map((m) => (m.groups ? { ...m.groups, _role: m.role } : null))
    .filter((g): g is GroupWithRole => g !== null && !g.is_archived);

  const friendships = friendshipsQuery.data?.data || [];
  const loadingGroups = groupsQuery.isLoading;
  const loadingFriendships = friendshipsQuery.isLoading;

  const requestedFriendshipId = useMemo(() => {
    if (!requestedCounterpartyId || !identity?.id) return null;

    const match = friendships.find((friendship) => {
      return (
        friendship.id === requestedCounterpartyId ||
        friendship.user_a === requestedCounterpartyId ||
        friendship.user_b === requestedCounterpartyId
      );
    });

    return match?.id ?? null;
  }, [friendships, identity?.id, requestedCounterpartyId]);

  // Normalize groups into unified option shape
  const groupOptions: ExpenseContextOption[] = useMemo(
    () =>
      groups.map<ExpenseContextOption>((g) => {
        const count = g.member_count?.[0]?.count;
        return {
          id: g.id,
          type: "group",
          name: g.name,
          subtitle:
            count != null
              ? `Group · ${count} ${count === 1 ? "member" : "members"}`
              : "Group",
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupMembersData]
  );

  // Normalize friendships into unified option shape
  const friendOptions: ExpenseContextOption[] = useMemo(
    () =>
      friendships.map<ExpenseContextOption>((f) => {
        const isUserA = f.user_a === identity?.id;
        const profile = isUserA ? f.user_b_profile : f.user_a_profile;
        return {
          id: f.id,
          type: "friend",
          name: profile?.full_name ?? "Friend",
          avatarUrl: profile?.avatar_url ?? undefined,
          subtitle: "Friend · One-on-one",
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [friendshipsQuery.data, identity?.id]
  );

  const allOptions = useMemo(
    () => [...groupOptions, ...friendOptions],
    [groupOptions, friendOptions]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return allOptions;
    return allOptions.filter((o) =>
      o.name.toLowerCase().includes(normalizedSearch)
    );
  }, [allOptions, normalizedSearch]);

  // Recents matched against current options (drops deleted/archived entries)
  const recentOptions = useMemo(() => {
    if (normalizedSearch) return [];
    return recentAll
      .map((r) => allOptions.find((o) => o.id === r.id && o.type === r.type))
      .filter((o): o is ExpenseContextOption => !!o);
  }, [recentAll, allOptions, normalizedSearch]);

  const visibleRecents = showAllRecents
    ? recentOptions
    : recentOptions.slice(0, RECENT_MAX);
  const hasMoreRecents = !showAllRecents && recentOptions.length > RECENT_MAX;

  // Auto-redirect when there is exactly one valid destination
  useEffect(() => {
    if (!identity) return;
    if (loadingGroups || loadingFriendships) return;
    if (requestedFriendshipId) {
      go({
        to: `/friends/${requestedFriendshipId}/expenses/create`,
        type: "replace",
      });
      return;
    }
    if (groups.length === 1 && friendships.length === 0) {
      go({ to: `/groups/${groups[0].id}/expenses/create`, type: "replace" });
    } else if (friendships.length === 1 && groups.length === 0) {
      go({
        to: `/friends/${friendships[0].id}/expenses/create`,
        type: "replace",
      });
    }
  }, [
    identity,
    groups.length,
    friendships.length,
    loadingGroups,
    loadingFriendships,
    requestedFriendshipId,
    go,
  ]);

  const handleClose = () => go({ to: "/" });

  const handleCreateGroup = () => {
    tap();
    go({ to: "/groups/create" });
  };

  const handleAddFriend = () => {
    tap();
    go({ to: "/friends" });
  };

  const handleSelect = (option: ExpenseContextOption) => {
    tap();
    addRecent({
      id: option.id,
      type: option.type,
      name: option.name,
      avatarUrl: option.avatarUrl,
    });
    if (option.type === "group") {
      go({ to: `/groups/${option.id}/expenses/create` });
    } else {
      go({ to: `/friends/${option.id}/expenses/create` });
    }
  };

  // Loading state
  if (!identity || loadingGroups || loadingFriendships) {
    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleClose}
        title="Loading..."
      >
        <div className="py-8 text-center text-sm text-muted-foreground">
          Setting up expense form...
        </div>
      </ResponsiveDialog>
    );
  }

  // Onboarding empty state — no groups or friends yet
  if (groups.length === 0 && friendships.length === 0) {
    return (
      <ResponsiveDialog
        open={true}
        onOpenChange={handleClose}
        title="Where would you like to add this expense?"
        description="Select the group or friend to share this expense with"
        className="max-w-md"
      >
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Create a group or add a friend first
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              FairPay needs a group or friend to know who should split the
              expense.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateGroup}>
              <UsersIcon className="mr-1.5 size-4" />
              Create group
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddFriend}>
              <UserPlusIcon className="mr-1.5 size-4" />
              Add friend
            </Button>
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
      <div className="flex flex-col gap-0 pt-4">
        {/* Unified search */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends or groups..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Scrollable list — bounded height keeps search + CTAs fixed */}
        <div className="max-h-[42vh] overflow-y-auto md:max-h-72">
          {/* No results */}
          {normalizedSearch && filteredOptions.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try a different keyword
              </p>
            </div>
          )}

          {/* Recent section — only when search is empty and recents exist */}
          {visibleRecents.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-1 pb-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Recent
                </span>
                {hasMoreRecents && (
                  <button
                    type="button"
                    onClick={() => setShowAllRecents(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    See all
                  </button>
                )}
              </div>
              <ItemGroup>
                {visibleRecents.map((option) => (
                  <ContextItemRow
                    key={`recent-${option.type}-${option.id}`}
                    name={option.name}
                    type={option.type}
                    avatarUrl={option.avatarUrl}
                    description={option.subtitle}
                    onClick={() => handleSelect(option)}
                  />
                ))}
              </ItemGroup>
              <Separator className="my-2" />
            </div>
          )}

          {/* All groups & friends — full list when not searching, filtered list when searching */}
          {(!normalizedSearch || filteredOptions.length > 0) && (
            <div>
              {!normalizedSearch && (
                <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">
                  All groups & friends
                </p>
              )}
              <ItemGroup>
                {(normalizedSearch ? filteredOptions : allOptions).map(
                  (option) => (
                    <ContextItemRow
                      key={`${option.type}-${option.id}`}
                      name={option.name}
                      type={option.type}
                      avatarUrl={option.avatarUrl}
                      description={option.subtitle}
                      onClick={() => handleSelect(option)}
                    />
                  )
                )}
              </ItemGroup>
            </div>
          )}
        </div>

        {/* Secondary CTAs — fixed at bottom, visually subordinate */}
        <div className="mt-3">
          <Separator />
          <div className="flex gap-2 pt-3 pb-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleCreateGroup}
            >
              <UsersIcon className="mr-1.5 size-3.5" />
              Create group
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleAddFriend}
            >
              <UserPlusIcon className="mr-1.5 size-3.5" />
              Add friend
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
