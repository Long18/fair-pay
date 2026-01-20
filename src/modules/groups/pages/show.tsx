import { useState, useMemo } from "react";
import { useOne, useList, useDelete, useGo, useGetIdentity, useUpdate, useCreate } from "@refinedev/core";
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
import { useCategoryBreakdown } from "@/hooks/use-category-breakdown";
import { SettleAllDialog } from "@/components/bulk-operations/SettleAllDialog";
import { QuickSettlementDialog } from "@/components/payments/quick-settlement-dialog";
import { PaymentMethod } from "@/lib/payment-methods";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/locale-utils";
import { toast } from "sonner";
import { ExpandableCard } from "@/components/ui/expandable-card";
import { CategoryBreakdown } from "@/components/groups/category-breakdown";
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
  RepeatIcon,
  UsersIcon,
  Users2Icon,
  CalendarIcon,
  SparklesIcon,
  CheckCircle2Icon,
  HistoryIcon,
  PieChartIcon
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
  const [quickSettleDialogOpen, setQuickSettleDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<{
    userId: string;
    userName: string;
    amount: number;
  } | null>(null);

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
  const updateMemberMutation = useUpdate();
  const createPaymentMutation = useCreate();

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

  // Category breakdown for insights
  const { breakdown: categoryBreakdown, isLoading: isLoadingCategories } = useCategoryBreakdown(
    'all_time',
    undefined,
    id
  );

  // Calculate member stats (expense count, total paid)
  const memberStats = useMemo(() => {
    const stats: Record<string, { expense_count: number; total_paid: number }> = {};

    allMembers.forEach((member: any) => {
      const memberExpenses = expenses.filter((e: any) => {
        const splits = e.expense_splits || [];
        return splits.some((s: any) => s.user_id === member.user_id);
      });

      const totalPaid = expenses
        .filter((e: any) => e.paid_by_user_id === member.user_id)
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      stats[member.user_id] = {
        expense_count: memberExpenses.length,
        total_paid: totalPaid,
      };
    });

    return stats;
  }, [allMembers, expenses]);

  const currentUserMember = allMembers.find((m: any) => m.user_id === identity?.id);
  const isAdmin = currentUserMember?.role === "admin";
  const isCreator = group?.created_by === identity?.id;

  const handleSettleUp = (toUserId: string, userName: string, amount: number) => {
    setSelectedSettlement({ userId: toUserId, userName, amount });
    setQuickSettleDialogOpen(true);
  };

  const handleConfirmSettlement = async (data: {
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    notes: string;
  }) => {
    if (!selectedSettlement || !identity?.id || !group?.id) return;

    try {
      await createPaymentMutation.mutateAsync({
        resource: "payments",
        values: {
          from_user_id: identity.id,
          to_user_id: selectedSettlement.userId,
          amount: data.amount,
          payment_date: data.paymentDate,
          payment_method: data.paymentMethod,
          notes: data.notes || null,
          group_id: group.id,
          created_by: identity.id,
        },
      });

      // Success feedback
      toast.success(
        `Payment of ${formatNumber(data.amount)} ₫ to ${selectedSettlement.userName} recorded!`
      );

      // Close dialog
      setQuickSettleDialogOpen(false);
      setSelectedSettlement(null);

      // Refresh data
      expensesQuery.refetch();
      paymentsQuery.refetch();

      // Show remaining balance toast if partial payment
      if (data.amount < selectedSettlement.amount) {
        const remaining = selectedSettlement.amount - data.amount;
        setTimeout(() => {
          toast.info(`Remaining balance: ${formatNumber(remaining)} ₫`, {
            action: {
              label: "Pay More",
              onClick: () => {
                setSelectedSettlement({
                  ...selectedSettlement,
                  amount: remaining,
                });
                setQuickSettleDialogOpen(true);
              },
            },
          });
        }, 1500);
      }
    } catch (error: any) {
      toast.error(`Failed to record payment: ${error.message}`);
    }
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

  const handleToggleRole = (memberId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";

    updateMemberMutation.mutate(
      {
        resource: "group_members",
        id: memberId,
        values: { role: newRole },
      },
      {
        onSuccess: () => {
          toast.success(
            `Member ${newRole === "admin" ? "promoted to admin" : "changed to member"}`
          );
          refetch();
        },
        onError: (error) => {
          toast.error(`Failed to update role: ${error.message}`);
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

        {/* Quick Actions */}
        {isAdmin && unsettledCount > 0 && (
          <div className="flex justify-end">
            <Button
              variant="default"
              size="lg"
              onClick={() => setSettleAllDialogOpen(true)}
            >
              <CheckCircle2Icon className="h-4 w-4 mr-2" />
              Settle All ({unsettledCount})
            </Button>
          </div>
        )}

        {/* Debt Simplification Toggle */}
        {allMembers.length >= 3 && balances.some(b => b.balance !== 0) && (
          <SimplifiedDebtsToggle
            isSimplified={useServerSimplification}
            onToggle={handleToggleSimplification}
            rawCount={balances.filter(b => b.balance !== 0).length}
            simplifiedCount={simplifiedCount}
            disabled={isLoadingSimplified}
          />
        )}

        {/* States Section */}
        <div className="space-y-6">
          {/* Empty State - No Expenses Yet */}
          {balances.every(b => b.balance === 0) && expenses.length === 0 && (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="space-y-4">
                  <div className="text-6xl mb-2">🎉</div>
                  <div>
                    <p className="font-semibold text-xl">Ready to track expenses!</p>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                      Add your first group expense to start splitting costs with members.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add First Expense
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Settled State - Has Expenses */}
          {balances.every(b => b.balance === 0) && expenses.length > 0 && (
            <Card className="border-2 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="py-16 text-center">
                <div className="space-y-4">
                  <div className="text-6xl mb-2">✅</div>
                  <div>
                    <p className="font-semibold text-xl text-green-900">All settled up!</p>
                    <p className="text-green-700 mt-2">
                      {expenses.length} expense(s) tracked, all balances cleared.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => go({ to: `/groups/${group.id}/expenses` })}
                    >
                      <HistoryIcon className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                    <Button
                      onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Another
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Category Breakdown - Insights Section */}
        {categoryBreakdown.length > 0 && (
          <ExpandableCard
            title="Spending by Category"
            subtitle="See where your money goes"
            badge={<Badge variant="outline">Insights</Badge>}
          >
            <CategoryBreakdown
              breakdown={categoryBreakdown}
              totalAmount={categoryBreakdown.reduce((sum, c) => sum + c.amount, 0)}
              currency="₫"
            />
          </ExpandableCard>
        )}

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
        >
          <ExpenseList groupId={group.id} members={membersList} />
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
              creatorId={group.created_by}
              isAdmin={isAdmin}
              onRemoveMember={handleRemoveMember}
              onToggleRole={handleToggleRole}
              isLoading={isLoadingMembers}
              showPagination={false}
              showStats={true}
              memberStats={memberStats}
              showHeader={false}
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

        {/* Quick Settlement Dialog */}
        {selectedSettlement && (
          <QuickSettlementDialog
            open={quickSettleDialogOpen}
            onOpenChange={(open) => {
              setQuickSettleDialogOpen(open);
              if (!open) setSelectedSettlement(null);
            }}
            recipientName={selectedSettlement.userName}
            amount={selectedSettlement.amount}
            currency="₫"
            onConfirm={handleConfirmSettlement}
          />
        )}
      </div>
    </div>
  );
};
