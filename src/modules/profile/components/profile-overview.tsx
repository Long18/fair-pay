import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { motion } from "framer-motion";
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

  const previewFriends = friends.slice(0, 4);
  const previewGroups = groups.slice(0, 4);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Activity stream */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("profile.activityStream", "Activity stream")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedActivityList
            activities={activities.slice(0, 12)}
            currentUserId={currentUserId}
            currency="VND"
            isLoading={isLoadingActivities}
            showSummary={false}
            showFilters={false}
            showSort={false}
            showTimeGrouping={true}
          />
          {activities.length > 12 && (
            <Button
              variant="link"
              className="mt-2 px-0"
              onClick={() => {
                tap();
                go({ to: "/dashboard" });
              }}
            >
              {t("profile.viewMore", "View more")}
              <ArrowRightIcon size={14} className="ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>

      {isOwnProfile && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Connections */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                {t("profile.connections", "Connections")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : previewFriends.length === 0 ? (
                <EmptyFriends />
              ) : (
                <ul className="space-y-3">
                  {previewFriends.map((friend, index) => (
                    <motion.li
                      key={friend.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="flex items-center gap-3"
                    >
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 min-w-0 text-left"
                        onClick={() => {
                          tap();
                          go({ to: `/profile/${friend.id}` });
                        }}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(friend.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{friend.full_name}</p>
                          {friend.email && (
                            <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                          )}
                        </div>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-primary"
                        onClick={() => {
                          tap();
                          go({ to: `/profile/${friend.id}` });
                        }}
                        aria-label={friend.full_name}
                      >
                        <ArrowRightIcon size={14} />
                      </Button>
                    </motion.li>
                  ))}
                </ul>
              )}
              <Button
                variant="link"
                className="mt-3 px-0"
                onClick={() => {
                  tap();
                  go({ to: "/connections?tab=friends" });
                }}
              >
                {t("profile.viewAllConnections", "View all connections")}
              </Button>
            </CardContent>
          </Card>

          {/* Groups preview */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                {t("profile.groups", "Groups")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : previewGroups.length === 0 ? (
                <EmptyGroups />
              ) : (
                <ul className="space-y-3">
                  {previewGroups.map((group, index) => (
                    <motion.li
                      key={group.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="flex items-center gap-3"
                    >
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 min-w-0 text-left"
                        onClick={() => {
                          tap();
                          go({ to: `/groups/${group.id}` });
                        }}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {group.avatar_url ? (
                            <Avatar className="h-10 w-10 rounded-lg">
                              <AvatarImage src={group.avatar_url} />
                              <AvatarFallback className="rounded-lg">
                                <UsersIcon size={16} />
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <UsersIcon size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">#{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("profile.updated", {
                              date: formatDateShort(group.created_at),
                              defaultValue: `Created ${formatDateShort(group.created_at)}`,
                            })}
                          </p>
                        </div>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
              <Button
                variant="link"
                className="mt-3 px-0"
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

      {/* Groups table (projects-style) */}
      {isOwnProfile && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <UsersIcon size={16} />
                {t("profile.myGroups", "My Groups")}
              </CardTitle>
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
            </div>
          </CardHeader>
          <CardContent>
            {groups.length === 0 && !groupsLoading ? (
              <EmptyGroups />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">{t("profile.group", "Group")}</th>
                      <th className="pb-3 font-medium hidden sm:table-cell">
                        {t("profile.created", "Created")}
                      </th>
                      <th className="pb-3 font-medium text-right">
                        {t("common.status", "Status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.slice(0, 6).map((group) => (
                      <tr
                        key={group.id}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          tap();
                          go({ to: `/groups/${group.id}` });
                        }}
                        onKeyDown={onButtonKeyDown(() => {
                          tap();
                          go({ to: `/groups/${group.id}` });
                        })}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 rounded-lg">
                              <AvatarImage src={group.avatar_url || undefined} />
                              <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                {getInitials(group.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {formatDateShort(group.created_at)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell text-muted-foreground">
                          {formatDateShort(group.created_at)}
                        </td>
                        <td className="py-3 text-right">
                          <Badge variant="secondary" className="rounded-full">
                            {t("profile.active", "Active")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {groups.length > 6 && (
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
