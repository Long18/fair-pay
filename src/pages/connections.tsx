import { useGetIdentity, useGo, useList } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageContent } from "@/components/ui/page-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, UserPlusIcon, UsersIcon, UserIcon } from "@/components/ui/icons";
import { AddFriendModal } from "@/modules/friends/components/add-friend-modal";
import { GroupListContent } from "@/modules/groups";
import { FriendListContent } from "@/modules/friends";
import type { Group } from "@/modules/groups/types";
import type { Friendship } from "@/modules/friends/types";
import type { Profile } from "@/modules/profile/types";
import { StaggerChildren } from "@/lib/motion";

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
        <StaggerChildren className="flex flex-col gap-4">
        <h1 className="sr-only">{t("connections.title", "Connections")}</h1>

        <Tabs
          variant="pill"
          value={activeTab}
          onValueChange={(v) => {
            tap();
            setActiveTab(v);
          }}
          className="gap-4"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-center px-1 sm:px-0">
              <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 overflow-hidden rounded-xl border border-border bg-muted/40 p-1 sm:w-auto">
                <TabsTrigger
                  value="groups"
                  className="min-h-9 gap-1.5 rounded-md px-2 text-xs focus-visible:ring-offset-0 sm:text-sm"
                >
                  <UsersIcon className="size-4 shrink-0" />
                  <span className="truncate">{t("connections.tabs.groups", "Groups")}</span>
                  {groupCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                    >
                      {groupCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger
                  value="friends"
                  className="min-h-9 gap-1.5 rounded-md px-2 text-xs focus-visible:ring-offset-0 sm:text-sm"
                >
                  <UserIcon className="size-4 shrink-0" />
                  <span className="truncate">{t("connections.tabs.friends", "Friends")}</span>
                  {friendCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                    >
                      {friendCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex w-full max-w-md justify-end px-1 sm:max-w-none sm:justify-end sm:px-0">
              {activeTab === "groups" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-9 gap-1.5"
                  onClick={() => {
                    tap();
                    go({ to: "/groups/create" });
                  }}
                >
                  <PlusIcon className="size-4 shrink-0" />
                  {t("groups.create", "New Group")}
                </Button>
              ) : (
                <AddFriendModal
                  trigger={
                    <Button type="button" size="sm" variant="outline" className="min-h-9 gap-1.5">
                      <UserPlusIcon className="size-4 shrink-0" />
                      {t("friends.addFriend", "Add Friend")}
                    </Button>
                  }
                />
              )}
            </div>
          </div>
          <TabsContent value="groups" className="mt-0">
            <GroupListContent variant="compact" />
          </TabsContent>
          <TabsContent value="friends" className="mt-0">
            <FriendListContent variant="compact" />
          </TabsContent>
        </Tabs>
        </StaggerChildren>
      </PageContent>
    </PageContainer>
  );
};
