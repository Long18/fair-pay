import { useState, useMemo } from "react";
import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Group, GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { MemberList } from "../components/member-list";
import { AddMemberModal } from "../components/add-member-modal";
import { ExpenseList, RecurringExpenseList } from "@/modules/expenses";
import { SimplifiedBalanceView, PaymentList, useBalanceCalculation } from "@/modules/payments";
import { SimplifiedDebtsToggle } from "@/components/dashboard/SimplifiedDebtsToggle";
import { useSimplifiedDebts } from "@/hooks/use-simplified-debts";
import { useSettleAllGroupDebts } from "@/hooks/use-bulk-operations";
import { SettleAllDialog } from "@/components/bulk-operations/SettleAllDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/locale-utils";
import { toast } from "sonner";
import { BalanceCard } from "@/components/groups/balance-card";
import { ExpandableCard } from "@/components/ui/expandable-card";
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

import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  ArrowRightIcon,
  ReceiptIcon,
  BanknoteIcon,
  RepeatIcon,
  UsersIcon,
  Users2Icon,
  CalendarIcon,
  SparklesIcon,
  CheckCircle2Icon,
  HistoryIcon
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
export const GroupShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [useServerSimplification, setUseServerSimplification] = useState(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem(`group-${id}-use-server-simplification`);
    return saved === "true";
  });
  const [settleAllDialogOpen, setSettleAllDialogOpen] = useState(false);

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
    queryOptions: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on window focus
    },
  });

  // Fetch payments for balance calculation
  const { query: paymentsQuery } = useList({
    resource: "payments",
    filters: [{ field: "group_id", operator: "eq", value: id }],
    queryOptions: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on window focus
    },
  });

  // Fetch server-side simplified debts
  const {
    simplifiedDebts,
    isLoading: isLoadingSimplified,
    transactionCount: simplifiedCount,
  } = useSimplifiedDebts({
    groupId: id,
    enabled: useServerSimplification && !!id,
  });

  // Bulk operations
  const settleAllMutation = useSettleAllGroupDebts();

  const { data: groupData, isLoading: isLoadingGroup } = groupQuery;
  const { data: membersData, isLoading: isLoadingMembers } = membersQuery;

  const group = groupData?.data;
  const allMembers = membersData?.data || [];
  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];

  const refetch = membersQuery.refetch;

  // Calculate balances
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

  // Calculate total balances for hero section
  const { totalIOwe, totalOwedToMe, netBalance } = useMemo(() => {
    const iOwe = balances
      .filter(b => b.balance < 0)
      .reduce((sum, b) => sum + Math.abs(b.balance), 0);

    const owedToMe = balances
      .filter(b => b.balance > 0)
      .reduce((sum, b) => sum + b.balance, 0);

    return {
      totalIOwe: iOwe,
      totalOwedToMe: owedToMe,
      netBalance: owedToMe - iOwe,
    };
  }, [balances]);

  const currentUserMember = allMembers.find((m: any) => m.user_id === identity?.id);
  const isAdmin = currentUserMember?.role === "admin";
  const isCreator = group?.created_by === identity?.id;

  const handleSettleUp = (toUserId: string, amount: number) => {
    if (!group?.id) return;
    go({
      to: `/groups/${group.id}/payments/create?toUser=${toUserId}&amount=${amount}`,
    });
  };

  const handleToggleSimplification = (enabled: boolean) => {
    setUseServerSimplification(enabled);
    // Save preference to localStorage
    localStorage.setItem(`group-${id}-use-server-simplification`, enabled.toString());
  };

  const handleSettleAll = async () => {
    if (!id) return;

    await settleAllMutation.mutateAsync(
      { groupId: id },
      {
        onSuccess: () => {
          setSettleAllDialogOpen(false);
          // Refetch all data
          groupQuery.refetch();
          membersQuery.refetch();
          expensesQuery.refetch();
          paymentsQuery.refetch();
        },
      }
    );
  };

  // Calculate unsettled splits count and total
  const unsettledSplits = expenses.flatMap((e: any) =>
    (e.expense_splits || []).filter((s: any) => !s.is_settled)
  );
  const unsettledCount = unsettledSplits.length;
  const unsettledTotal = unsettledSplits.reduce(
    (sum: number, s: any) => sum + (s.computed_amount - (s.settled_amount || 0)),
    0
  );

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
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  return (
    <div className="container px-4 sm:px-6 py-4 sm:py-8 max-w-7xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 sm:mb-6"
        onClick={() => go({ to: "/groups" })}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Back to Groups</span>
        <span className="sm:hidden">Back</span>
      </Button>

      <div className="space-y-6">
        {/* Group Header Card */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Users2Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-2xl sm:text-3xl font-bold truncate">
                        {group.name}
                      </CardTitle>
                      {group.description && (
                        <p className="text-muted-foreground mt-2 text-sm sm:text-base line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      Created{" "}
                      {formatDate(group.created_at, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UsersIcon className="h-4 w-4" />
                    <span>{allMembers.length} {allMembers.length === 1 ? 'member' : 'members'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <Button
                  className="w-full sm:w-auto"
                  size="lg"
                  onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
                <div className="flex gap-2">
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 sm:flex-none"
                      onClick={() => go({ to: `/groups/edit/${group.id}` })}
                    >
                      <PencilIcon className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit Group</span>
                      <span className="sm:hidden">Edit</span>
                    </Button>
                  )}
                  {isCreator && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="lg" className="flex-1 sm:flex-none">
                          <Trash2Icon className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete Group</span>
                          <span className="sm:hidden">Delete</span>
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

        {/* Hero Balance Section - Sticky */}
        <div className="sticky top-0 z-10 bg-background pb-4">
          <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                {/* My Total Balance */}
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <BanknoteIcon className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      My Balance
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* I Owe */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-red-600 font-medium">YOU OWE</span>
                      <span className="text-2xl font-bold text-red-600">
                        {formatNumber(totalIOwe)} ₫
                      </span>
                    </div>
                    {/* Owed to Me */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-green-600 font-medium">OWES YOU</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatNumber(totalOwedToMe)} ₫
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                {isAdmin && unsettledCount > 0 && (
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => setSettleAllDialogOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle2Icon className="h-4 w-4 mr-2" />
                    Settle All ({unsettledCount})
                  </Button>
                )}
              </div>

              {/* Debt Simplification Toggle */}
              {allMembers.length >= 3 && (
                <div className="pt-4 border-t mt-4">
                  <SimplifiedDebtsToggle
                    isSimplified={useServerSimplification}
                    onToggle={handleToggleSimplification}
                    rawCount={balances.filter(b => b.balance !== 0).length}
                    simplifiedCount={simplifiedCount}
                    disabled={isLoadingSimplified}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Debts Section */}
        <div className="space-y-6">
          {/* I Owe Section */}
          {balances.filter(b => b.balance < 0).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-red-600 rounded-full" />
                <h3 className="text-lg font-semibold text-red-600 uppercase tracking-wide">
                  You Owe
                </h3>
              </div>
              <div className="space-y-2">
                {balances
                  .filter(b => b.balance < 0)
                  .map(balance => (
                    <BalanceCard
                      key={balance.user_id}
                      amount={Math.abs(balance.balance)}
                      currency="₫"
                      status="owe"
                      userName={balance.user_name}
                      userAvatar={balance.avatar_url || undefined}
                      onClick={() => handleSettleUp(balance.user_id, Math.abs(balance.balance))}
                      isExpandable={false}
                    />
                  ))
                }
              </div>
            </div>
          )}

          {/* Owes Me Section */}
          {balances.filter(b => b.balance > 0).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-green-600 rounded-full" />
                <h3 className="text-lg font-semibold text-green-600 uppercase tracking-wide">
                  Owes You
                </h3>
              </div>
              <div className="space-y-2">
                {balances
                  .filter(b => b.balance > 0)
                  .map(balance => (
                    <BalanceCard
                      key={balance.user_id}
                      amount={balance.balance}
                      currency="₫"
                      status="owed"
                      userName={balance.user_name}
                      userAvatar={balance.avatar_url || undefined}
                      isExpandable={false}
                    />
                  ))
                }
              </div>
            </div>
          )}

          {/* All Settled State */}
          {balances.every(b => b.balance === 0) && (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="space-y-4">
                  <div className="text-6xl">✅</div>
                  <div>
                    <p className="font-semibold text-lg">All settled up!</p>
                    <p className="text-muted-foreground">No outstanding balances.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Expenses Section */}
        <ExpandableCard
          title="Recent Expenses"
          subtitle={`${expenses.length} expense(s)`}
          badge={
            expenses.length > 0 && (
              <Badge variant="secondary">
                {formatNumber(expenses.reduce((sum, e) => sum + e.amount, 0))} ₫
              </Badge>
            )
          }
          expanded={false}
        >
          <ExpenseList groupId={group.id} members={membersList} />
        </ExpandableCard>

        {/* Recurring Expenses Section */}
        <ExpandableCard
          title="Recurring Expenses"
          subtitle="Monthly subscriptions"
          expanded={false}
        >
          <RecurringExpenseList groupId={group.id} />
        </ExpandableCard>

        {/* Members Section */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Members</CardTitle>
                <Badge variant="secondary">{allMembers.length}</Badge>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddMemberModalOpen(true)}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
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
              members={allMembers.map((m: any) => ({
                ...m,
                profile: m.profiles,
              }))}
              currentUserId={identity?.id || ""}
              isAdmin={isAdmin}
              onRemoveMember={handleRemoveMember}
              isLoading={isLoadingMembers}
              showPagination={false}
            />
          </CardContent>
        </Card>

        {/* Settle All Dialog */}
        <SettleAllDialog
          open={settleAllDialogOpen}
          onOpenChange={setSettleAllDialogOpen}
          onConfirm={handleSettleAll}
          splitsCount={unsettledCount}
          totalAmount={unsettledTotal}
          isLoading={settleAllMutation.isPending}
        />
      </div>
    </div>
  );
};
