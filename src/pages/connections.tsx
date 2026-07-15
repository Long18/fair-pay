import { useGetIdentity, useGo, useList } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageContent } from "@/components/ui/page-content";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { tap } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "friends" ? "friends" : DEFAULT_TAB;

  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams, { replace: true });
  };

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

  return (
    <PageContainer variant="default" padding="none">
      <PageContent>
        <PageHeader
          title={t("connections.title", "Connections")}
          description={t(
            "connections.subtitle",
            "Manage groups and friends in one place"
          )}
          action={
            activeTab === "groups" ? (
              <Button
                size="sm"
                onClick={() => {
                  tap();
                  go({ to: "/groups/create" });
                }}
              >
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
            )
          }
        />

        <Tabs value={activeTab} onValueChange={(v) => { tap(); setActiveTab(v); }}>
          <TabsList>
            <TabsTrigger value="groups" className="gap-2">
              <UsersIcon className="h-4 w-4" />
              {t("connections.groups", "Groups")}
              {groupCount > 0 ? (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    activeTab === "groups"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  )}
                >
                  {groupCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <UserIcon className="h-4 w-4" />
              {t("connections.friends", "Friends")}
              {friendCount > 0 ? (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    activeTab === "friends"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  )}
                >
                  {friendCount}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="groups" className="mt-4">
            <GroupListContent />
          </TabsContent>
          <TabsContent value="friends" className="mt-4">
            <FriendListContent />
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
  );
};
