import { useMemo } from "react";
import { useGetIdentity, useGo, useList } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageContent } from "@/components/ui/page-content";
import { PlusIcon, UserPlusIcon, UsersIcon, UserIcon } from "@/components/ui/icons";
import { AddFriendModal } from "@/modules/friends/components/add-friend-modal";
import { GroupListContent } from "@/modules/groups";
import { FriendListContent } from "@/modules/friends";
import { cn } from "@/lib/utils";
import type { Group } from "@/modules/groups/types";
import type { Friendship } from "@/modules/friends/types";
import type { Profile } from "@/modules/profile/types";

const DEFAULT_TAB = "groups";

export const ConnectionsPage = () => {
  const { t } = useTranslation();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "friends" ? "friends" : DEFAULT_TAB;

  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams, { replace: true });
  };

  // Counts for tab badges
  const { query: groupsQuery } = useList<Group>({
    resource: "groups",
    pagination: { mode: "off" },
    meta: {
      select: "id, group_members!inner(user_id)",
    },
    filters: [
      { field: "group_members.user_id", operator: "eq", value: identity?.id },
    ],
    queryOptions: { enabled: !!identity?.id },
  });

  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    pagination: { mode: "off" },
    meta: { select: "id, status" },
    filters: [{ field: "status", operator: "eq", value: "accepted" }],
  });

  const groupCount = groupsQuery.data?.data?.length ?? 0;
  const friendCount = friendshipsQuery.data?.data?.length ?? 0;

  const tabs = [
    { key: "groups", label: t("connections.groups", "Groups"), icon: UsersIcon, count: groupCount },
    { key: "friends", label: t("connections.friends", "Friends"), icon: UserIcon, count: friendCount },
  ];

  return (
    <PageContainer variant="default">
      <PageContent>
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex gap-2">
            {activeTab === "groups" ? (
              <Button size="sm" onClick={() => go({ to: "/groups/create" })}>
                <PlusIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {t("groups.create", "New Group")}
                </span>
              </Button>
            ) : (
              <AddFriendModal
                trigger={
                  <Button size="sm" variant="outline">
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">
                      {t("friends.addFriend", "Add Friend")}
                    </span>
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "groups" ? <GroupListContent /> : <FriendListContent />}
      </PageContent>
    </PageContainer>
  );
};
