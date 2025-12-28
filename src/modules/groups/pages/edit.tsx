import { useOne, useUpdate, useGo } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupForm } from "../components/group-form";
import { Group, GroupFormValues } from "../types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";
export const GroupEdit = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();

  const { query: groupQuery } = useOne<Group>({
    resource: "groups",
    id: id!,
    meta: {
      select: "*",
    },
  });

  const updateMutation = useUpdate();

  const { data, isLoading: isLoadingGroup } = groupQuery;
  const group = data?.data;

  const handleSubmit = (values: GroupFormValues) => {
    if (!group?.id) {
      toast.error("Group not found");
      return;
    }

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
        },
      }
    );
  };

  if (isLoadingGroup || !group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading group...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: `/groups/show/${group.id}` })}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Group
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Group</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update group information
          </p>
        </CardHeader>
        <CardContent>
          <GroupForm
            onSubmit={handleSubmit}
            defaultValues={{
              name: group.name,
              description: group.description || "",
            }}
            isLoading={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};
