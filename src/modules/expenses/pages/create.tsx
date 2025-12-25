import { useCreate, useGo, useList, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "../components/expense-form";
import { ExpenseFormValues } from "../types";
import { Profile } from "@/modules/profile/types";
import { GroupMember } from "@/modules/groups/types";
import { toast } from "sonner";

export const ExpenseCreate = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const { query: membersQuery } = useList<GroupMember>({
    resource: "group_members",
    filters: [
      {
        field: "group_id",
        operator: "eq",
        value: groupId,
      },
    ],
    meta: {
      select: "*, profiles:user_id(id, full_name)",
    },
  });

  const createMutation = useCreate();

  const members = membersQuery.data?.data?.map((m: any) => ({
    id: m.profiles.id,
    full_name: m.profiles.full_name,
  })) || [];

  const handleSubmit = (values: ExpenseFormValues) => {
    const { splits, ...expenseData } = values;

    createMutation.mutate(
      {
        resource: "expenses",
        values: expenseData,
        meta: {
          splits,
        },
      },
      {
        onSuccess: async (data) => {
          const expenseId = data.data.id;
          
          // Create splits
          const splitPromises = splits.map((split) =>
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/expense_splits`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                expense_id: expenseId,
                user_id: split.user_id,
                split_method: values.split_method,
                split_value: split.split_value,
                computed_amount: split.computed_amount,
              }),
            })
          );

          await Promise.all(splitPromises);
          
          toast.success("Expense created successfully");
          go({ to: `/groups/show/${groupId}` });
        },
        onError: (error) => {
          toast.error(`Failed to create expense: ${error.message}`);
        },
      }
    );
  };

  const handleClose = () => {
    go({ to: `/groups/show/${groupId}` });
  };

  if (!groupId || !identity) {
    return null;
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <ExpenseForm
          groupId={groupId}
          members={members}
          currentUserId={identity.id}
          onSubmit={handleSubmit}
          isLoading={false}
        />
      </DialogContent>
    </Dialog>
  );
};

