import { useList, useGetIdentity, useGo } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useInstantDelete } from "@/hooks/use-instant-mutation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { Profile } from "@/modules/profile/types";
import { Friendship, Friend } from "../types";
import { AddFriendModal } from "../components/add-friend-modal";
import { FriendRow } from "../components/friend-row";
import { PeopleYouMayKnowList } from "../components/people-you-may-know-list";
import { RemoveFriendDialog } from "../components/remove-friend-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CheckIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { matchesSearchFields } from "@/lib/search-utils";
import { cn } from "@/lib/utils";
import { journeyTracking } from "@/lib/journey-tracking";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "@/components/ui/icons";

const REQUEST_PREVIEW = 3;
const COMPACT_FRIENDS_PAGE_SIZE = 6;

export type FriendListContentProps = {
  /** Tighter hub layout for Connections / profile tabs. */
  variant?: "default" | "compact";
};

export const FriendListContent = ({ variant = "default" }: FriendListContentProps) => {
  const compact = variant === "compact";
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();
  const go = useGo();
  const [searchParams] = useSearchParams();

  const [removingFriend, setRemovingFriend] = useState<Friend | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { tap, warning } = useHaptics();
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllIncoming, setShowAllIncoming] = useState(false);
  const [showAllSent, setShowAllSent] = useState(false);
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  const pageSize = compact ? COMPACT_FRIENDS_PAGE_SIZE : 10;

  const { query } = useList<Friendship>({
    resource: "friendships",
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url, email), user_b_profile:profiles!user_b(id, full_name, avatar_url, email)",
    },
    pagination: {
      mode: "off",
    },
  });

  const friendships: any[] = query.data?.data || [];

  // Transform friendships into friend list from current user's perspective
  const friends: Friend[] = useMemo(() => {
    if (!identity?.id) return [];

    return friendships.map((f) => {
      const isUserA = f.user_a === identity.id;
      const friendProfile = isUserA ? f.user_b_profile : f.user_a_profile;
      const isRequester = f.created_by === identity.id;

      return {
        friendship_id: f.id,
        user_id: isUserA ? f.user_b : f.user_a,
        full_name: friendProfile?.full_name || "Unknown",
        avatar_url: friendProfile?.avatar_url,
        email: friendProfile?.email,
        status: f.status,
        created_at: f.created_at,
        is_requester: isRequester,
      };
    });
  }, [friendships, identity]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    return friends.filter((friend) =>
      matchesSearchFields(searchQuery, friend.full_name, friend.email)
    );
  }, [friends, searchQuery]);

  const acceptedFriends = filteredFriends.filter((f) => f.status === "accepted");
  const pendingRequests = filteredFriends.filter(
    (f) => f.status === "pending" && !f.is_requester
  );
  const sentRequests = filteredFriends.filter(
    (f) => f.status === "pending" && f.is_requester
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalItems = acceptedFriends.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [safePage, currentPage]);

  const paginatedAcceptedFriends = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return acceptedFriends.slice(start, start + pageSize);
  }, [acceptedFriends, safePage, pageSize]);

  const paginationMetadata: PaginationMetadata = {
    totalItems,
    totalPages,
    currentPage: safePage,
    pageSize,
  };

  const handleAccept = (friendshipId: string) => {
    tap();
    toast.promise(
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/friendships?id=eq.${friendshipId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ status: 'accepted' }),
      }).then(() => query.refetch()),
      {
        loading: t('friends.accepting', 'Accepting...'),
        success: t('friends.acceptSuccess', 'Friend request accepted'),
        error: t('friends.acceptError', 'Failed to accept request'),
      }
    );
  };

  const handleReject = (friendshipId: string) => {
    warning();
    deleteMutation.mutate(
      {
        resource: "friendships",
        id: friendshipId,
      },
      {
        onSuccess: () => {
          toast.success(t('friends.rejectSuccess', 'Friend request rejected'));
          query.refetch();
        },
        onError: (error) => {
          toast.error(t('friends.rejectError', `Failed to reject request: ${error.message}`));
        },
      }
    );
  };

  const handleRemoveFriend = (friend: Friend) => {
    journeyTracking.trackEvent({
      event_name: "friend_remove_clicked",
      event_category: "friend",
      page_path: window.location.pathname,
      flow_name: "friend-remove",
      step_name: "confirm-dialog",
      properties: { friend_user_id: friend.user_id },
    });
    setRemovingFriend(friend);
  };

  const confirmRemoveFriend = () => {
    if (!removingFriend) return;
    warning();
    setIsRemoving(true);
    deleteMutation.mutate(
      {
        resource: "friendships",
        id: removingFriend.friendship_id,
      },
      {
        onSuccess: () => {
          journeyTracking.trackEvent({
            event_name: "friend_remove_success",
            event_category: "friend",
            page_path: window.location.pathname,
            flow_name: "friend-remove",
            step_name: "success",
            properties: { friend_user_id: removingFriend.user_id },
          });
          toast.success(t('friends.removeSuccess', 'Friend removed'));
          query.refetch();
          setRemovingFriend(null);
        },
        onError: (error) => {
          journeyTracking.trackEvent({
            event_name: "friend_remove_failed",
            event_category: "friend",
            page_path: window.location.pathname,
            flow_name: "friend-remove",
            step_name: "failed",
            properties: {
              friend_user_id: removingFriend.user_id,
              reason: "server_error",
            },
          });
          toast.error(t('friends.removeError', `Failed to remove friend: ${error.message}`));
        },
        onSettled: () => {
          setIsRemoving(false);
        },
      }
    );
  };

  const incomingVisible = compact && !showAllIncoming
    ? pendingRequests.slice(0, REQUEST_PREVIEW)
    : pendingRequests;
  const incomingHidden =
    compact && !showAllIncoming
      ? Math.max(0, pendingRequests.length - REQUEST_PREVIEW)
      : 0;
  const sentVisible = compact && !showAllSent
    ? sentRequests.slice(0, REQUEST_PREVIEW)
    : sentRequests;
  const sentHidden =
    compact && !showAllSent
      ? Math.max(0, sentRequests.length - REQUEST_PREVIEW)
      : 0;

  const sectionCardClass = compact
    ? "rounded-xl border border-border/60 shadow-none"
    : undefined;
  const sectionHeaderClass = compact ? "py-3" : undefined;

  useEffect(() => {
    if (!compact) {
      setIncomingOpen(true);
      setSentOpen(true);
      return;
    }
    if (searchParams.get("section") === "requests" && pendingRequests.length > 0) {
      setIncomingOpen(true);
      return;
    }
    setIncomingOpen(
      pendingRequests.length > 0 && pendingRequests.length <= REQUEST_PREVIEW
    );
    setSentOpen(
      sentRequests.length > 0 && sentRequests.length <= REQUEST_PREVIEW
    );
  }, [compact, pendingRequests.length, sentRequests.length, searchParams]);

  const friendsSearchField = (
    <div className="relative w-full">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={t("friends.searchPlaceholder", "Search friends...")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9 pl-9"
        aria-label={t("friends.searchPlaceholder", "Search friends...")}
      />
    </div>
  );

  const myFriendsSection = (
    <Card
      className={cn(
        sectionCardClass,
        compact && "border-primary/25 bg-card ring-1 ring-primary/10"
      )}
    >
      <CardHeader className={cn(sectionHeaderClass, compact && "space-y-3 pb-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className={compact ? "text-lg font-semibold tracking-tight" : undefined}>
            {t("friends.myFriends", "My Friends")}
          </CardTitle>
          <Badge variant="secondary" className="h-6 rounded-md px-2 text-xs tabular-nums">
            {acceptedFriends.length}
          </Badge>
        </div>
        {compact ? friendsSearchField : null}
      </CardHeader>
      <CardContent className={compact ? "pt-0" : undefined}>
        {acceptedFriends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('friends.noFriends', 'No friends yet. Add someone to start splitting expenses!')}</p>
          </div>
        ) : (
          <div className={compact ? "divide-y divide-border/60" : "space-y-3"}>
            {paginatedAcceptedFriends.map((friend) => (
              <FriendRow
                key={friend.friendship_id}
                friend={{
                  id: friend.user_id,
                  full_name: friend.full_name,
                  avatar_url: friend.avatar_url,
                  email: friend.email,
                }}
                onNavigate={() => go({ to: `/friends/${friend.friendship_id}` })}
                onRemove={() => handleRemoveFriend(friend)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const requestPanelsGridClass = cn(
    "grid gap-4",
    pendingRequests.length > 0 && sentRequests.length > 0 && "md:grid-cols-2"
  );

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact ? (
        <ScrollReveal direction="up">
          <div className="flex flex-col gap-3 sm:flex-row">{friendsSearchField}</div>
        </ScrollReveal>
      ) : null}

      {query.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!query.isLoading && (
        <StaggerChildren className={compact ? "space-y-4" : "space-y-6"}>
          {compact ? (
            <>
              {myFriendsSection}
              <PaginationControls
                metadata={paginationMetadata}
                onPageChange={setCurrentPage}
                className="pt-0"
              />
            </>
          ) : null}

          <div className={compact ? requestPanelsGridClass : "contents"}>
          {/* Pending Requests (Incoming) */}
          {pendingRequests.length > 0 && (
          <Card className={cn(sectionCardClass, compact && "min-h-0 h-full")}>
            <Collapsible
              open={compact ? true : incomingOpen}
              onOpenChange={compact ? () => undefined : setIncomingOpen}
            >
            <CardHeader className={cn(sectionHeaderClass, compact && "pb-2")}>
              {compact ? (
                <CardTitle className="text-base">
                  {t("friends.requests", "Friend Requests")}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    ({pendingRequests.length})
                  </span>
                </CardTitle>
              ) : (
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CardTitle>{t("friends.requests", "Friend Requests")}</CardTitle>
                  <ChevronDownIcon
                    size={18}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform",
                      incomingOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              )}
            </CardHeader>
            <CollapsibleContent>
            <CardContent className={compact ? "pt-0" : undefined}>
              <div className={compact ? "divide-y divide-border/60" : "space-y-3"}>
                {incomingVisible.map((friend) => (
                  <div
                    key={friend.friendship_id}
                    className={
                      compact
                        ? "flex min-h-10 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        : "flex min-h-11 flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        <AvatarImage src={friend.avatar_url || undefined} alt={friend.full_name} />
                        <AvatarFallback className="text-xs sm:text-sm">
                          {friend.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">{friend.full_name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {t('friends.sentRequest', 'Sent you a friend request')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => handleAccept(friend.friendship_id)}
                      >
                        <CheckIcon className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">{t('common.accept', 'Accept')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => handleReject(friend.friendship_id)}
                      >
                        <XIcon className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">{t('common.reject', 'Reject')}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {incomingHidden > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 w-full text-muted-foreground"
                  onClick={() => setShowAllIncoming(true)}
                >
                  {t("friends.showMoreRequests", {
                    defaultValue: "Show {{count}} more requests",
                    count: incomingHidden,
                  })}
                </Button>
              ) : null}
            </CardContent>
            </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
          <Card className={cn(sectionCardClass, compact && "min-h-0 h-full")}>
            <Collapsible
              open={compact ? true : sentOpen}
              onOpenChange={compact ? () => undefined : setSentOpen}
            >
            <CardHeader className={cn(sectionHeaderClass, compact && "pb-2")}>
              {compact ? (
                <CardTitle className="text-base">
                  {t("friends.pendingRequests", "Pending Requests")}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    ({sentRequests.length})
                  </span>
                </CardTitle>
              ) : (
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CardTitle>{t("friends.pendingRequests", "Pending Requests")}</CardTitle>
                  <ChevronDownIcon
                    size={18}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform",
                      sentOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              )}
            </CardHeader>
            <CollapsibleContent>
            <CardContent className={compact ? "pt-0" : undefined}>
              <div className={compact ? "divide-y divide-border/60" : "space-y-3"}>
                {sentVisible.map((friend) => (
                  <div
                    key={friend.friendship_id}
                    className={
                      compact
                        ? "flex min-h-10 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        : "flex min-h-11 flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        <AvatarImage src={friend.avatar_url || undefined} alt={friend.full_name} />
                        <AvatarFallback className="text-xs sm:text-sm">
                          {friend.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">{friend.full_name}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {t('friends.pending', 'Pending')}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full sm:w-auto shrink-0"
                      onClick={() => handleReject(friend.friendship_id)}
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                ))}
              </div>
              {sentHidden > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 w-full text-muted-foreground"
                  onClick={() => setShowAllSent(true)}
                >
                  {t("friends.showMorePending", {
                    defaultValue: "Show {{count}} more pending",
                    count: sentHidden,
                  })}
                </Button>
              ) : null}
            </CardContent>
            </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
          </div>

          {compact ? (
            <Card className={sectionCardClass}>
              <CardContent className="pt-4">
                <PeopleYouMayKnowList limit={REQUEST_PREVIEW} />
              </CardContent>
            </Card>
          ) : (
            <PeopleYouMayKnowList />
          )}

          {!compact ? (
            <>
              {myFriendsSection}
              <PaginationControls
                metadata={paginationMetadata}
                onPageChange={setCurrentPage}
                className="pt-2"
              />
            </>
          ) : null}
        </StaggerChildren>
      )}

      {/* Remove Friend Dialog */}
      <RemoveFriendDialog
        open={!!removingFriend}
        onOpenChange={(open) => !open && setRemovingFriend(null)}
        friendName={removingFriend?.full_name || ''}
        hasUnpaidExpenses={false} // TODO: Check for unpaid expenses
        onConfirm={confirmRemoveFriend}
        isRemoving={isRemoving}
      />
    </div>
  );
};

export const FriendList = () => {
  const { t } = useTranslation();

  return (
    <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
              {t('friends.title', 'Friends')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              {t('friends.subtitle', 'Manage your friends and split expenses 1-on-1')}
            </p>
          </div>
          <AddFriendModal />
        </div>

        <FriendListContent />
      </div>
    </div>
  );
};
