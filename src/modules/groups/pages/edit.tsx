import { useOne, useUpdate, useGo, useGetIdentity } from "@refinedev/core";
import { useState } from "react";
import { useParams } from "react-router";
import { GroupForm } from "../components/group-form";
import { Group, GroupFormValues } from "../types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftIcon } from "@/components/ui/icons";
import type { Profile } from "@/modules/profile/types";

export const GroupEdit = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { query: groupQuery } = useOne<Group>({
    resource: "groups",
    id: id!,
    meta: { select: "*" },
  });

  const updateMutation = useUpdate();
  const { data, isLoading: isLoadingGroup } = groupQuery;
  const group = data?.data;

  const handleSubmit = (values: GroupFormValues) => {
    if (!group?.id) {
      toast.error("Group not found");
      return;
    }

    setIsSubmitting(true);
    updateMutation.mutate(
      {
        resource: "groups",
        id: group.id,
        values,
      },
      {
        onSuccess: () => {
          toast.success("Group updated successfully");
          go({ to: `/groups/show/${group.id}` });
        },
        onError: (error) => {
          toast.error(`Failed to update group: ${error.message}`);
          setIsSubmitting(false);
        },
      }
    );
  };

  if (isLoadingGroup) {
    return (
      <div className="container max-w-2xl py-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container max-w-2xl py-6">
        <div className="text-center py-16 space-y-3">
          <p className="text-lg font-medium text-muted-foreground">Group not found</p>
          <Button variant="outline" onClick={() => go({ to: "/groups" })}>
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => go({ to: `/groups/show/${group.id}` })}
          aria-label="Back to group"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Edit Group</h1>
          <p className="text-sm text-muted-foreground">
            Update {group.name}
          </p>
        </div>
      </div>

      <GroupForm
        onSubmit={handleSubmit}
        defaultValues={{
          name: group.name,
          description: group.description || "",
          simplify_debts: group.simplify_debts,
          avatar_url: group.avatar_url || "",
        }}
        isLoading={isSubmitting}
        currentUserId={identity?.id}
      />
    </div>
  );
};
