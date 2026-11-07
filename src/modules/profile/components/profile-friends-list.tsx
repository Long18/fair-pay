import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/user-display";
import { ChevronRightIcon, UserIcon } from "@/components/ui/icons";
import { useGo } from "@refinedev/core";
import { EmptyFriends } from "./profile-empty-states";
import { useHaptics } from "@/hooks/use-haptics";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";

const PROFILE_FRIENDS_TAB_PREVIEW = 5;

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

interface ProfileFriendsListProps {
  friends: Friend[];
  isLoading?: boolean;
  className?: string;
}

export const ProfileFriendsList = ({
  friends,
  isLoading,
  className,
}: ProfileFriendsListProps) => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  if (isLoading) {
    return (
      <ul className={cn("divide-y divide-border/60 rounded-lg border border-border/60", className)}>
        {[...Array(4)].map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (friends.length === 0) {
    return <EmptyFriends className={className} />;
  }

  const previewFriends = friends.slice(0, PROFILE_FRIENDS_TAB_PREVIEW);
  const hasMore = friends.length > PROFILE_FRIENDS_TAB_PREVIEW;

  const openFriend = (friendId: string) => {
    tap();
    go({ to: `/friends/${friendId}` });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="px-0.5 text-xs text-muted-foreground">
        {t("profile.friendsCount", { count: friends.length })}
      </p>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
        {previewFriends.map((friend) => (
          <li key={friend.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              onClick={() => openFriend(friend.id)}
              onKeyDown={onButtonKeyDown(() => openFriend(friend.id))}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={friend.avatar_url || undefined} alt="" />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {friend.full_name
                    ? getInitials(friend.full_name)
                    : <UserIcon size={14} />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{friend.full_name}</p>
                {friend.email ? (
                  <p className="truncate text-xs text-muted-foreground">{friend.email}</p>
                ) : null}
              </div>
              <ChevronRightIcon size={16} className="shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>

      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-full text-muted-foreground"
        onClick={() => {
          tap();
          go({ to: hasMore ? "/connections?tab=friends" : "/friends" });
        }}
      >
        {hasMore
          ? t("profile.viewAllFriends", {
              count: friends.length,
              defaultValue: `View all ${friends.length} friends`,
            })
          : t("profile.manageFriends", "Manage friends")}
        {hasMore ? (
          <span className="ml-1 tabular-nums text-foreground">({friends.length})</span>
        ) : null}
        <ChevronRightIcon size={14} className="ml-auto" />
      </Button>
    </div>
  );
};
