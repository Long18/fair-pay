import { useMemo } from "react";
import { useGetIdentity, useGo, useList } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageContent } from "@/components/ui/page-content";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlusIcon, UserPlusIcon } from "@/components/ui/icons";
import { AddFriendModal } from "@/modules/friends/components/add-friend-modal";
import { GroupListContent } from "@/modules/groups";
import { FriendListContent } from "@/modules/friends";
import type { Group } from "@/modules/groups/types";
import type { Friendship } from "@/modules/friends/types";
import type { Profile } from "@/modules/profile/types";

const DEFAULT_TAB = "groups";

export const ConnectionsPage = () => {
  const { t } = useTranslation();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") === "friends" ? "friends" : DEFAULT_TAB;

  const { query: groupsQuery } = useList<Group>({
    resource: "groups",
    pagination: { mode: "off" },
    meta: {
      select: "id, is_archived",
    },
  });

  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    pagination: { mode: "off" },
    meta: {
      select: "id, status, user_a, user_b, created_by",
    },
  });

  const groupCount = useMemo(() => {
    const allGroups = groupsQuery.data?.data || [];
    return allGroups.filter((g) => !g.is_archived).length;
  }, [groupsQuery.data]);
  const acceptedFriendsCount = useMemo(() => {
    if (!identity?.id) return 0;
    const friendships = friendshipsQuery.data?.data || [];
    return friendships.filter((friendship) => friendship.status === "accepted").length;
  }, [friendshipsQuery.data, identity?.id]);

  return (
    <PageContainer variant="default">
      <PageHeader
        title={t("connections.title", "Connections")}
        description={t("connections.subtitle", "Manage groups and friends in one place")}
        action={
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
            <Button
              onClick={() => go({ to: "/groups/create" })}
              size="lg"
              className="w-full sm:w-auto"
            >
              <PlusIcon className="mr-2 h-5 w-5" />
              {t("groups.createGroup", "Create Group")}
            </Button>
            <AddFriendModal
              trigger={
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <UserPlusIcon className="mr-2 h-5 w-5" />
                  {t("friends.addFriend", "Add Friend")}
                </Button>
              }
            />
          </div>
        }
      />

      <PageContent>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-center w-full">
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={(value) => {
                if (!value) return;
                setSearchParams({ tab: value }, { replace: true });
              }}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <ToggleGroupItem value="groups" className="flex-1 sm:flex-none min-w-[7rem]">
                {t("connections.tabs.groups", "Groups")}
              </ToggleGroupItem>
              <ToggleGroupItem value="friends" className="flex-1 sm:flex-none min-w-[7rem]">
                {t("connections.tabs.friends", "Friends")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("connections.summary", "{{groups}} groups • {{friends}} friends", {
                groups: groupCount,
                friends: acceptedFriendsCount,
              })}
            </p>
            <div className="hidden sm:block text-xs text-muted-foreground">
              {activeTab === "groups"
                ? t("connections.tabs.groups", "Groups")
                : t("connections.tabs.friends", "Friends")}
            </div>
          </div>
        </div>

        {activeTab === "groups" ? <GroupListContent /> : <FriendListContent />}
      </PageContent>
    </PageContainer>
  );
};
