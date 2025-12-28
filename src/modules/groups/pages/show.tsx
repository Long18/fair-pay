import { useState } from "react";
import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Group, GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { MemberList } from "../components/member-list";
import { AddMemberModal } from "../components/add-member-modal";
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
import { formatDate } from "@/lib/locale-utils";

import { ArrowLeftIcon, PencilIcon, Trash2Icon, PlusIcon } from "@/components/ui/icons";
export const GroupShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [currentMemberPage, setCurrentMemberPage] = useState(1);
  const memberPageSize = 10;

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
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!id,
    },
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
      select: "*, expense_splits(*)",
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
  const allMembers = membersData?.data || [];
  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];

  const refetch = membersQuery.refetch;

  // Pagination metadata for members
  const totalMembers = allMembers.length;
  const memberPaginationMetadata = {
    totalItems: totalMembers,
    totalPages: Math.ceil(totalMembers / memberPageSize),
    currentPage: currentMemberPage,
    pageSize: memberPageSize,
  };

  // Client-side pagination: slice the members array
  const startIndex = (currentMemberPage - 1) * memberPageSize;
  const endIndex = startIndex + memberPageSize;
  const members = allMembers.slice(startIndex, endIndex);

  // Calculate balances (use all members, not just paginated slice)
  const membersList = allMembers.map((m: any) => ({
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

  const currentUserMember = allMembers.find((m: any) => m.user_id === identity?.id);
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
    <div className="container px-4 sm:px-6 py-4 sm:py-8 max-w-7xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: "/groups" })}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Back to Groups</span>
        <span className="sm:hidden">Back</span>
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl">{group.name}</CardTitle>
                {group.description && (
                  <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                    {group.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Created{" "}
                  {formatDate(group.created_at, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
                <div className="flex gap-2">
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => go({ to: `/groups/edit/${group.id}` })}
                    >
                      <PencilIcon className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  )}
                  {isCreator && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
                          <Trash2Icon className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
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
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4">
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
            <TabsTrigger value="balances" className="text-xs sm:text-sm">Balances</TabsTrigger>
            <TabsTrigger value="recurring" className="text-xs sm:text-sm">Recurring</TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm">Members</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="mt-6">
            <ExpenseList groupId={group.id} members={membersList} />
          </TabsContent>
          <TabsContent value="balances" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <SimplifiedBalanceView
                  balances={balances}
                  currentUserId={identity?.id || ""}
                  simplifyDebts={group?.simplify_debts || false}
                  onSettleUp={handleSettleUp}
                  currency="VND"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                <PaymentList groupId={group.id} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="recurring" className="mt-6">
            <RecurringExpenseList groupId={group.id} />
          </TabsContent>
          <TabsContent value="members" className="mt-6">
            <AddMemberModal
              groupId={group.id}
              open={addMemberModalOpen}
              onOpenChange={setAddMemberModalOpen}
              onSuccess={() => {
                membersQuery.refetch();
                setAddMemberModalOpen(false);
              }}
            />
            <MemberList
              members={members.map((m: any) => ({
                ...m,
                profile: m.profiles,
              }))}
              currentUserId={identity?.id || ""}
              isAdmin={isAdmin}
              onRemoveMember={handleRemoveMember}
              onAddMember={isAdmin ? () => setAddMemberModalOpen(true) : undefined}
              isLoading={isLoadingMembers}
              paginationMetadata={memberPaginationMetadata}
              onPageChange={setCurrentMemberPage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
