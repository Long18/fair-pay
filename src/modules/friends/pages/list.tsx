import { useList, useGetIdentity, useUpdate, useDelete, useGo } from "@refinedev/core";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/modules/profile/types";
import { Friendship, Friend } from "../types";
import { AddFriendModal } from "../components/add-friend-modal";
import { toast } from "sonner";

import { CheckIcon, XIcon, Trash2Icon, ChevronRightIcon } from "@/components/ui/icons";
export const FriendList = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const updateMutation = useUpdate();
  const deleteMutation = useDelete();
  const go = useGo();

  const { query } = useList<Friendship>({
    resource: "friendships",
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
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
        status: f.status,
        created_at: f.created_at,
        is_requester: isRequester,
      };
    });
  }, [friendships, identity]);

  const acceptedFriends = friends.filter(f => f.status === "accepted");
  const pendingRequests = friends.filter(f => f.status === "pending" && !f.is_requester);
  const sentRequests = friends.filter(f => f.status === "pending" && f.is_requester);

  const handleAccept = (friendshipId: string) => {
    updateMutation.mutate(
      {
        resource: "friendships",
        id: friendshipId,
        values: { status: "accepted" },
      },
      {
        onSuccess: () => {
          toast.success("Friend request accepted");
          query.refetch();
        },
        onError: (error) => {
          toast.error(`Failed to accept request: ${error.message}`);
        },
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
          toast.success("Friend request rejected");
          query.refetch();
        },
        onError: (error) => {
          toast.error(`Failed to reject request: ${error.message}`);
        },
      }
    );
  };

  const handleRemoveFriend = (friendshipId: string, friendName: string) => {
    if (!confirm(`Remove ${friendName} from friends?`)) return;

    deleteMutation.mutate(
      {
        resource: "friendships",
        id: friendshipId,
      },
      {
        onSuccess: () => {
          toast.success("Friend removed");
          query.refetch();
        },
        onError: (error) => {
          toast.error(`Failed to remove friend: ${error.message}`);
        },
      }
    );
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading friends...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Friends</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Manage your friends and split expenses 1-on-1
            </p>
          </div>
          <AddFriendModal />
        </div>

        {/* Pending Requests (Incoming) */}
        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests</CardTitle>
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
                          Sent you a friend request
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
                        <span className="hidden sm:inline">Accept</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => handleReject(friend.friendship_id)}
                      >
                        <XIcon className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Reject</span>
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
              <CardTitle>Pending Requests</CardTitle>
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
                        <Badge variant="secondary" className="text-xs mt-1">Pending</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full sm:w-auto shrink-0"
                      onClick={() => handleReject(friend.friendship_id)}
                    >
                      Cancel
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
            <CardTitle>My Friends ({acceptedFriends.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {acceptedFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No friends yet. Add someone to start splitting expenses!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {acceptedFriends.map((friend) => (
                  <div
                    key={friend.friendship_id}
                    className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => go({ to: `/friends/${friend.user_id}` })}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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
                      <div className="font-medium text-sm sm:text-base truncate min-w-0 flex-1">{friend.full_name}</div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 sm:h-auto sm:w-auto p-0 sm:px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend.friendship_id, friend.full_name);
                        }}
                      >
                        <Trash2Icon className="h-4 w-4 text-destructive" />
                        <span className="hidden sm:inline ml-1">Remove</span>
                      </Button>
                      <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
