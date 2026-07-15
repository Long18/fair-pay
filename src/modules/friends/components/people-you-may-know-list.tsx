import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useGetIdentity } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { useInstantCreate } from "@/hooks/use-instant-mutation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2Icon, UserPlusIcon, XIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import type { Profile } from "@/modules/profile/types";
import {
  usePeopleYouMayKnow,
  type PeopleYouMayKnowItem,
} from "@/modules/friends/hooks/use-people-you-may-know";

type PeopleYouMayKnowListProps = {
  enabled?: boolean;
  onConnected?: () => void;
};

export function PeopleYouMayKnowList({
  enabled = true,
  onConnected,
}: PeopleYouMayKnowListProps) {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const queryClient = useQueryClient();
  const { tap, success } = useHaptics();
  const createMutation = useInstantCreate();
  const { suggestions, isLoading, dismiss, isDismissing } = usePeopleYouMayKnow(
    enabled && !!identity?.id,
  );
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const handleConnect = useCallback(
    (item: PeopleYouMayKnowItem) => {
      if (!identity?.id) return;
      tap();
      const userA = identity.id < item.user_id ? identity.id : item.user_id;
      const userB = identity.id < item.user_id ? item.user_id : identity.id;
      setConnectingId(item.user_id);
      createMutation.mutate(
        {
          resource: "friendships",
          values: {
            user_a: userA,
            user_b: userB,
            status: "pending",
            created_by: identity.id,
          },
        },
        {
          onSuccess: () => {
            success();
            toast.success(
              t("friends.requestSent", {
                defaultValue: "Friend request sent to {{name}}",
                name: item.full_name,
              }),
            );
            void dismiss(item.user_id).catch(() => undefined);
            void queryClient.invalidateQueries({ queryKey: ["people-you-may-know"] });
            onConnected?.();
            setConnectingId(null);
          },
          onError: (error: { message?: string }) => {
            toast.error(
              t("friends.requestError", {
                defaultValue: "Failed to send request: {{message}}",
                message: error.message ?? "Unknown error",
              }),
            );
            setConnectingId(null);
          },
        },
      );
    },
    [createMutation, dismiss, identity?.id, onConnected, queryClient, success, t, tap],
  );

  const handleDismiss = async (item: PeopleYouMayKnowItem) => {
    tap();
    setDismissingId(item.user_id);
    try {
      await dismiss(item.user_id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(
        t("friends.dismissError", {
          defaultValue: "Failed to dismiss suggestion: {{message}}",
          message,
        }),
      );
    } finally {
      setDismissingId(null);
    }
  };

  if (!enabled || (!isLoading && suggestions.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">
          {t("friends.peopleYouMayKnow", { defaultValue: "People you may know" })}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("friends.peopleYouMayKnowHint", {
            defaultValue: "Suggested by mutual friends",
          })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((item) => {
            const isConnecting = connectingId === item.user_id;
            const isDismissingThis = dismissingId === item.user_id;
            return (
              <li
                key={item.user_id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={item.avatar_url ?? undefined} alt={item.full_name} />
                  <AvatarFallback>
                    {item.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("friends.mutualCount", {
                      defaultValue: "{{count}} mutual friends",
                      count: item.mutual_count,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    disabled={isConnecting || isDismissing || isDismissingThis}
                    onClick={() => handleConnect(item)}
                  >
                    {isConnecting ? (
                      <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlusIcon className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1 hidden sm:inline">
                      {t("friends.connect", { defaultValue: "Connect" })}
                    </span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={isConnecting || isDismissing || isDismissingThis}
                    onClick={() => void handleDismiss(item)}
                    aria-label={t("friends.dismiss", { defaultValue: "Dismiss" })}
                  >
                    {isDismissingThis ? (
                      <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
