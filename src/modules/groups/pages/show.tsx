import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import { Group, GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { MemberList } from "../components/member-list";
import { ExpenseList, RecurringExpenseList } from "@/modules/expenses";
import { SimplifiedBalanceView, PaymentList, useBalanceCalculation } from "@/modules/payments";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const GroupShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const { query: groupQuery } = useOne<Group>({
    resource: "groups",
    id: id!,
    meta: {
      select: "*",
    },
  });

  const { query: membersQuery } = useList<GroupMember>({
    resource: "group_members",
    filters: [
      {
        field: "group_id",
        operator: "eq",
        value: id,
      },
    ],
    meta: {
      select: "*, profiles!user_id(*)",
    },
  });

  const deleteGroupMutation = useDelete();
  const deleteMemberMutation = useDelete();

  // Fetch expenses for balance calculation
  const { query: expensesQuery } = useList({
    resource: "expenses",
    filters: [{ field: "group_id", operator: "eq", value: id }],
    meta: {
      select: "*, expense_splits!expense_id(*)",
    },
  });

  // Fetch payments for balance calculation
  const { query: paymentsQuery } = useList({
    resource: "payments",
    filters: [{ field: "group_id", operator: "eq", value: id }],
  });

  const { data: groupData, isLoading: isLoadingGroup } = groupQuery;
  const { data: membersData, isLoading: isLoadingMembers } = membersQuery;

  const group = groupData?.data;
  const members = membersData?.data || [];
  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];

  const refetch = membersQuery.refetch;

  // Calculate balances
  const membersList = members.map((m: any) => ({
    id: m.user_id,
    full_name: m.profiles?.full_name || "Unknown",
    avatar_url: m.profiles?.avatar_url,
  }));

  const balances = useBalanceCalculation({
    expenses,
    payments,
    currentUserId: identity?.id || "",
    members: membersList,
  });

  const currentUserMember = members.find((m: any) => m.user_id === identity?.id);
  const isAdmin = currentUserMember?.role === "admin";
  const isCreator = group?.created_by === identity?.id;

  const handleSettleUp = (toUserId: string, amount: number) => {
    if (!group?.id) return;
    go({
      to: `/groups/${group.id}/payments/create?toUser=${toUserId}&amount=${amount}`,
    });
  };

  const handleDeleteGroup = () => {
    if (!group?.id) return;

    deleteGroupMutation.mutate(
      {
        resource: "groups",
        id: group.id,
      },
      {
        onSuccess: () => {
          toast.success("Group deleted successfully");
          go({ to: "/groups" });
        },
        onError: (error) => {
          toast.error(`Failed to delete group: ${error.message}`);
        },
      }
    );
  };

  const handleRemoveMember = (memberId: string) => {
    deleteMemberMutation.mutate(
      {
        resource: "group_members",
        id: memberId,
      },
      {
        onSuccess: () => {
          toast.success("Member removed successfully");
          refetch();
        },
        onError: (error) => {
          toast.error(`Failed to remove member: ${error.message}`);
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
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: "/groups" })}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Groups
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">{group.name}</CardTitle>
                {group.description && (
                  <p className="text-muted-foreground mt-2">
                    {group.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Created{" "}
                  {new Date(group.created_at).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => go({ to: `/groups/edit/${group.id}` })}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {isCreator && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the group and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteGroup}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="mt-6">
            <ExpenseList groupId={group.id} members={membersList} />
          </TabsContent>
          <TabsContent value="balances" className="mt-6">
            <SimplifiedBalanceView
              balances={balances}
              currentUserId={identity?.id || ""}
              simplifyDebts={group?.simplify_debts || false}
              onSettleUp={handleSettleUp}
              currency="VND"
            />
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Payment History</h3>
              <PaymentList groupId={group.id} />
            </div>
          </TabsContent>
          <TabsContent value="recurring" className="mt-6">
            <RecurringExpenseList groupId={group.id} />
          </TabsContent>
          <TabsContent value="members" className="mt-6">
            <MemberList
              members={members.map((m: any) => ({
                ...m,
                profile: m.profiles,
              }))}
              currentUserId={identity?.id || ""}
              isAdmin={isAdmin}
              onRemoveMember={handleRemoveMember}
              isLoading={isLoadingMembers}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
