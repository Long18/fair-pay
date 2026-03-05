import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGo, useList, useGetIdentity } from "@refinedev/core";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UsersIcon, UserPlusIcon, InfoIcon } from "@/components/ui/icons";
import { Group } from "@/modules/groups/types";
import { Friendship } from "@/modules/friends/types";
import { Profile } from "@/modules/profile/types";
import { useHaptics } from "@/hooks/use-haptics";

interface CreateRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRecurringDialog({
  open,
  onOpenChange,
}: CreateRecurringDialogProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [selectedContext, setSelectedContext] = useState<string>("");
  const { tap } = useHaptics();

  // Fetch user's groups
  const { query: groupsQuery } = useList<Group>({
    resource: "groups",
    pagination: { mode: "off" },
    meta: {
      select: "id, name",
    },
    queryOptions: {
      enabled: open,
    },
  });

  // Fetch user's friendships
  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: [
      {
        field: "status",
        operator: "eq",
        value: "accepted",
      },
    ],
    pagination: { mode: "off" },
    meta: {
      select: "id, user_id, friend_id, profiles!friendships_user_id_fkey(full_name), profiles!friendships_friend_id_fkey(full_name)",
    },
    queryOptions: {
      enabled: open,
    },
  });

  const groups = groupsQuery.data?.data || [];
  const friendships = friendshipsQuery.data?.data || [];
  const isLoading = groupsQuery.isLoading || friendshipsQuery.isLoading;

  const handleContinue = () => {
    if (!selectedContext) return;
    tap();

    const [type, id] = selectedContext.split(":");

    // Navigate to expense creation with recurring context
    if (type === "group") {
      go({ to: `/groups/${id}/expenses/create?recurring=true` });
    } else if (type === "friend") {
      go({ to: `/friends/${id}/expenses/create?recurring=true` });
    }

    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialog.Header
        title={t('recurring.create.title', 'Create Recurring Expense')}
        description={t(
          'recurring.create.description',
          'Select a group or friend for this recurring expense. You will then create the expense template.'
        )}
      />

      <ResponsiveDialog.Content>
        <div className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t(
                'recurring.create.info',
                'A recurring expense creates automatic copies of an expense on a regular schedule (weekly, monthly, etc.).'
              )}
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : groups.length === 0 && friendships.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t(
                  'recurring.create.noContext',
                  'You need at least one group or friend to create a recurring expense. Please create a group or add a friend first.'
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <RadioGroup value={selectedContext} onValueChange={(v) => { tap(); setSelectedContext(v); }}>
              <div className="space-y-3">
                {groups.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <UsersIcon className="h-4 w-4" />
                      {t('groups.title', 'Groups')}
                    </div>
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                        onClick={() => setSelectedContext(`group:${group.id}`)}
                      >
                        <RadioGroupItem value={`group:${group.id}`} id={`group-${group.id}`} />
                        <Label
                          htmlFor={`group-${group.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {group.name}
                        </Label>
                      </div>
                    ))}
                  </>
                )}

                {friendships.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mt-4">
                      <UserPlusIcon className="h-4 w-4" />
                      {t('friends.title', 'Friends')}
                    </div>
                    {friendships.map((friendship: any) => {
                      const friendName =
                        friendship.user_id === identity?.id
                          ? friendship.profiles?.full_name ||
                            friendship.friendships_friend_id_fkey?.full_name ||
                            'Friend'
                          : friendship.profiles?.full_name ||
                            friendship.friendships_user_id_fkey?.full_name ||
                            'Friend';

                      return (
                        <div
                          key={friendship.id}
                          className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                          onClick={() => setSelectedContext(`friend:${friendship.id}`)}
                        >
                          <RadioGroupItem value={`friend:${friendship.id}`} id={`friend-${friendship.id}`} />
                          <Label
                            htmlFor={`friend-${friendship.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            {friendName}
                          </Label>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </RadioGroup>
          )}
        </div>
      </ResponsiveDialog.Content>

      <ResponsiveDialog.Footer>
        <Button variant="outline" onClick={() => { tap(); onOpenChange(false); }}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedContext || isLoading}
          className="max-sm:w-full"
        >
          {t('common.continue', 'Continue')}
        </Button>
      </ResponsiveDialog.Footer>
    </ResponsiveDialog>
  );
}
