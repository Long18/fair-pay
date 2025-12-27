import { useCreate, useGo, useGetIdentity } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupForm } from "../components/group-form";
import { GroupFormValues } from "../types";
import { toast } from "sonner";

export const GroupCreate = () => {
  const go = useGo();
  const createMutation = useCreate();
  const { data: identity } = useGetIdentity<{ id: string }>();

  const handleSubmit = (values: GroupFormValues) => {
    if (!identity?.id) {
      toast.error("User identity not found. Please try logging in again.");
      return;
    }

    createMutation.mutate(
      {
        resource: "groups",
        values: {
          ...values,
          created_by: identity.id,
        },
      },
      {
        onSuccess: (data) => {
          toast.success("Group created successfully");
          go({ to: `/groups/show/${data.data.id}` });
        },
        onError: (error) => {
          toast.error(`Failed to create group: ${error.message}`);
        },
      }
    );
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Group</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create a group to share expenses with friends
          </p>
        </CardHeader>
        <CardContent>
          <GroupForm onSubmit={handleSubmit} isLoading={false} />
        </CardContent>
      </Card>
    </div>
  );
};
