import { useList, useGetIdentity, useDelete, useGo } from "@refinedev/core";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Profile } from "@/modules/profile/types";
import { Friendship, Friend } from "../types";
import { AddFriendModal } from "../components/add-friend-modal";
import { FriendRow } from "../components/friend-row";
import { RemoveFriendDialog } from "../components/remove-friend-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CheckIcon, SearchIcon, XIcon } from "@/components/ui/icons";

export const FriendListContent = () => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useDelete();
  const go = useGo();

  const [removingFriend, setRemovingFriend] = useState<Friend | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    const query = searchQuery.trim().toLowerCase();
    return friends.filter((friend) => {
      const name = friend.full_name?.toLowerCase() || "";
      const email = friend.email?.toLowerCase() || "";
      return name.includes(query) || email.includes(query);
    });
  }, [friends, searchQuery]);

  const acceptedFriends = filteredFriends.filter((f) => f.status === "accepted");
  const pendingRequests = filteredFriends.filter(
    (f) => f.status === "pending" && !f.is_requester
  );
  const sentRequests = filteredFriends.filter(
    (f) => f.status === "pending" && f.is_requester
  );

  const handleAccept = (friendshipId: string) => {
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
    setRemovingFriend(friend);
  };

  const confirmRemoveFriend = () => {
    if (!removingFriend) return;

    setIsRemoving(true);
    deleteMutation.mutate(
      {
        resource: "friendships",
        id: removingFriend.friendship_id,
      },
      {
        onSuccess: () => {
          toast.success(t('friends.removeSuccess', 'Friend removed'));
          query.refetch();
          setRemovingFriend(null);
        },
        onError: (error) => {
          toast.error(t('friends.removeError', `Failed to remove friend: ${error.message}`));
        },
        onSettled: () => {
          setIsRemoving(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('friends.searchPlaceholder', 'Search friends...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {query.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!query.isLoading && (
        <>
          {/* Pending Requests (Incoming) */}
          {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('friends.requests', 'Friend Requests')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequests.map((friend) => (
                  <div
                    key={friend.friendship_id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg"
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
            </CardContent>
          </Card>
        )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('friends.pendingRequests', 'Pending Requests')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sentRequests.map((friend) => (
                  <div
                    key={friend.friendship_id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg"
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
            </CardContent>
          </Card>
        )}

          {/* Accepted Friends */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('friends.myFriends', 'My Friends')} ({acceptedFriends.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {acceptedFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('friends.noFriends', 'No friends yet. Add someone to start splitting expenses!')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedFriends.map((friend) => (
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
        </>
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
