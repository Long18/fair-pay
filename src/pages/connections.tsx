import { useMemo } from "react";
import { useGetIdentity, useGo, useList } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
      select: "id",
    },
  });

  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    pagination: { mode: "off" },
    meta: {
      select: "id, status, user_a, user_b, created_by",
    },
  });

  const groupCount = groupsQuery.data?.data?.length ?? 0;
  const acceptedFriendsCount = useMemo(() => {
    if (!identity?.id) return 0;
    const friendships = friendshipsQuery.data?.data || [];
    return friendships.filter((friendship) => friendship.status === "accepted").length;
  }, [friendshipsQuery.data, identity?.id]);

  return (
    <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
              {t("connections.title", "Connections")}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              {t("connections.subtitle", "Manage groups and friends in one place")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={() => go({ to: "/groups/create" })} size="lg">
              <PlusIcon className="mr-2 h-5 w-5" />
              {t("groups.createGroup", "Create Group")}
            </Button>
            <AddFriendModal
              trigger={
                <Button size="lg" variant="outline">
                  <UserPlusIcon className="mr-2 h-5 w-5" />
                  {t("friends.addFriend", "Add Friend")}
                </Button>
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <ToggleGroupItem value="groups" className="flex-1 sm:flex-none">
              {t("connections.tabs.groups", "Groups")}
            </ToggleGroupItem>
            <ToggleGroupItem value="friends" className="flex-1 sm:flex-none">
              {t("connections.tabs.friends", "Friends")}
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">
            {t("connections.summary", "{{groups}} groups • {{friends}} friends", {
              groups: groupCount,
              friends: acceptedFriendsCount,
            })}
          </p>
        </div>

        {activeTab === "groups" ? <GroupListContent /> : <FriendListContent />}
      </div>
    </div>
  );
};
