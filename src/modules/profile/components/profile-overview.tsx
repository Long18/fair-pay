import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { cn } from "@/lib/utils";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { formatDateShort } from "@/lib/locale-utils";
import { getInitials } from "@/components/user-display";
import { EnhancedActivityList } from "@/components/dashboard/activity/enhanced-activity-list";
import type { EnhancedActivityItem } from "@/types/activity";
import {
  ArrowRightIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { EmptyFriends, EmptyGroups } from "./profile-empty-states";

const PROFILE_ACTIVITY_PREVIEW = 6;
const PROFILE_GROUP_PREVIEW = 4;
const PROFILE_MY_GROUPS_PREVIEW = 5;

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

interface Group {
  id: string;
  name: string;
  created_at: string;
  avatar_url?: string;
}

interface ProfileOverviewProps {
  activities: EnhancedActivityItem[];
  isLoadingActivities: boolean;
  currentUserId: string;
  friends: Friend[];
  friendsLoading: boolean;
  groups: Group[];
  groupsLoading: boolean;
  isOwnProfile: boolean;
  className?: string;
}

function ConnectionRow({
  name,
  secondary,
  avatarUrl,
  onClick,
}: {
  name: string;
  secondary?: string;
  avatarUrl?: string;
  onClick: () => void;
}) {
  const { tap } = useHaptics();

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => {
          tap();
          onClick();
        }}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          {secondary ? (
            <p className="truncate text-xs text-muted-foreground">{secondary}</p>
          ) : null}
        </div>
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-primary"
        onClick={() => {
          tap();
          onClick();
        }}
        aria-label={name}
      >
        <ArrowRightIcon size={14} />
      </Button>
    </li>
  );
}

export function ProfileOverview({
  activities,
  isLoadingActivities,
  currentUserId,
  friends,
  friendsLoading,
  groups,
  groupsLoading,
  isOwnProfile,
  className,
}: ProfileOverviewProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  const previewFriends = friends.slice(0, PROFILE_GROUP_PREVIEW);
  const previewGroups = groups.slice(0, PROFILE_GROUP_PREVIEW);
  const previewActivities = activities.slice(0, PROFILE_ACTIVITY_PREVIEW);

  return (
    <div className={cn("space-y-4", className)}>
      {isOwnProfile && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card flushList className="flex h-full flex-col border-border/60">
            <CardHeader>
              <CardTitle>{t("profile.connections", "Connections")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pb-5">
              {friendsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-11 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : previewFriends.length === 0 ? (
                <EmptyFriends />
              ) : (
                <ul className="divide-y divide-border/60">
                  {previewFriends.map((friend) => (
                    <ConnectionRow
                      key={friend.id}
                      name={friend.full_name}
                      secondary={friend.email}
                      avatarUrl={friend.avatar_url}
                      onClick={() => go({ to: `/profile/${friend.id}` })}
                    />
                  ))}
                </ul>
              )}
              <Button
                variant="link"
                className="mt-auto px-0 pt-2"
                onClick={() => {
                  tap();
                  go({ to: "/connections?tab=friends" });
                }}
              >
                {t("profile.viewAllConnections", "View all connections")}
              </Button>
            </CardContent>
          </Card>

          <Card flushList className="flex h-full flex-col border-border/60">
            <CardHeader>
              <CardTitle>{t("profile.groups", "Groups")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pb-5">
              {groupsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-11 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : previewGroups.length === 0 ? (
                <EmptyGroups />
              ) : (
                <ul className="divide-y divide-border/60">
                  {previewGroups.map((group) => (
                    <li key={group.id} className="flex items-center gap-3 py-2.5">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => {
                          tap();
                          go({ to: `/groups/show/${group.id}` });
                        }}
                      >
                        <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                          <AvatarImage src={group.avatar_url || undefined} className="rounded-lg" />
                          <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(group.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">#{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("profile.updated", {
                              date: formatDateShort(group.created_at),
                              defaultValue: `Created ${formatDateShort(group.created_at)}`,
                            })}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="link"
                className="mt-auto px-0 pt-2"
                onClick={() => {
                  tap();
                  go({ to: "/connections?tab=groups" });
                }}
              >
                {t("profile.viewAllGroups", "View all groups")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden border-border/60">
        <CardHeader className="border-b">
          <CardTitle>{t("profile.activityStream", "Activity stream")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 last:pb-0">
          <EnhancedActivityList
            activities={previewActivities}
            currentUserId={currentUserId}
            currency="VND"
            isLoading={isLoadingActivities}
            showSummary={false}
            showFilters={false}
            showSort={false}
            showTimeGrouping={true}
            variant="dashboard"
            compactControls
            className="max-w-full"
          />
          {activities.length > PROFILE_ACTIVITY_PREVIEW && (
            <div className="border-t border-border/50 px-4 py-2">
              <Button
                variant="link"
                className="h-auto px-0"
                onClick={() => {
                  tap();
                  go({ to: "/dashboard" });
                }}
              >
                {t("profile.viewMore", "View more")}
                <ArrowRightIcon size={14} className="ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwnProfile && (
        <Card flushList className="border-border/60">
          <CardHeader>
            <CardTitle className="flex min-h-10 items-center gap-2">
              <UsersIcon size={16} className="shrink-0" />
              {t("profile.myGroups", "My Groups")}
            </CardTitle>
            <CardAction>
              <Button
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  tap();
                  go({ to: "/groups/create" });
                }}
              >
                <PlusIcon size={14} className="mr-1.5" />
                {t("profile.newGroup", "New Group")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pb-5">
            {groups.length === 0 && !groupsLoading ? (
              <EmptyGroups />
            ) : (
              <>
                <div className="mb-2 hidden grid-cols-[1fr_auto_auto] gap-3 text-xs font-medium text-muted-foreground sm:grid">
                  <span>{t("profile.group", "Group")}</span>
                  <span className="w-24">{t("profile.created", "Created")}</span>
                  <span className="w-16 text-right">{t("common.status", "Status")}</span>
                </div>
                <ul className="divide-y divide-border/60">
                  {groups.slice(0, PROFILE_MY_GROUPS_PREVIEW).map((group) => (
                    <li key={group.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/30 sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-3"
                        onClick={() => {
                          tap();
                          go({ to: `/groups/show/${group.id}` });
                        }}
                        onKeyDown={onButtonKeyDown(() => {
                          tap();
                          go({ to: `/groups/show/${group.id}` });
                        })}
                      >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                          <AvatarImage src={group.avatar_url || undefined} className="rounded-lg" />
                          <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(group.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {formatDateShort(group.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className="hidden text-sm text-muted-foreground sm:block sm:w-24">
                        {formatDateShort(group.created_at)}
                      </span>
                      <div className="ml-auto sm:w-16 sm:text-right">
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          {t("profile.active", "Active")}
                        </Badge>
                      </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {groups.length > PROFILE_MY_GROUPS_PREVIEW && (
              <Button
                variant="link"
                className="mt-2 px-0"
                onClick={() => {
                  tap();
                  go({ to: "/connections?tab=groups" });
                }}
              >
                {t("profile.viewAllGroups", "View all groups")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
