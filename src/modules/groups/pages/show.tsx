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
import { SimplifiedDebtsToggle } from "@/components/dashboard/SimplifiedDebtsToggle";
import { useSimplifiedDebts } from "@/hooks/use-simplified-debts";
import { useSettleAllGroupDebts } from "@/hooks/use-bulk-operations";
import { SettleAllDialog } from "@/components/bulk-operations/SettleAllDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/locale-utils";
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
  const [currentMemberPage, setCurrentMemberPage] = useState(1);
  const memberPageSize = 10;
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
  });

  // Fetch payments for balance calculation
  const { query: paymentsQuery } = useList({
    resource: "payments",
    filters: [{ field: "group_id", operator: "eq", value: id }],
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
                    <span>{totalMembers} {totalMembers === 1 ? 'member' : 'members'}</span>
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

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50">
            <TabsTrigger
              value="expenses"
              className="text-xs sm:text-sm flex items-center gap-2 data-[state=active]:bg-background"
            >
              <ReceiptIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
              <span className="sm:hidden">Exp</span>
            </TabsTrigger>
            <TabsTrigger
              value="balances"
              className="text-xs sm:text-sm flex items-center gap-2 data-[state=active]:bg-background"
            >
              <BanknoteIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Balances</span>
              <span className="sm:hidden">Bal</span>
            </TabsTrigger>
            <TabsTrigger
              value="recurring"
              className="text-xs sm:text-sm flex items-center gap-2 data-[state=active]:bg-background"
            >
              <RepeatIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Recurring</span>
              <span className="sm:hidden">Rec</span>
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="text-xs sm:text-sm flex items-center gap-2 data-[state=active]:bg-background"
            >
              <UsersIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
              <span className="sm:hidden">Mem</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="mt-6">
            <ExpenseList groupId={group.id} members={membersList} />
          </TabsContent>
          <TabsContent value="balances" className="mt-6">
            <div className="space-y-6">
              {/* Action Bar */}
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    {/* Settle All Button */}
                    {isAdmin && unsettledCount > 0 && (
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => setSettleAllDialogOpen(true)}
                        disabled={settleAllMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {settleAllMutation.isPending ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Settling...
                          </>
                        ) : (
                          <>
                            <CheckCircle2Icon className="h-4 w-4 mr-2" />
                            Settle All Debts ({unsettledCount} {unsettledCount === 1 ? 'split' : 'splits'})
                          </>
                        )}
                      </Button>
                    )}

                    {/* Debt Simplification Toggle */}
                    {allMembers.length >= 3 && (
                      <div className={cn("w-full sm:w-auto", isAdmin && unsettledCount > 0 && "sm:ml-auto")}>
                        <SimplifiedDebtsToggle
                          isSimplified={useServerSimplification}
                          onToggle={handleToggleSimplification}
                          rawCount={balances.filter(b => b.balance !== 0).length}
                          simplifiedCount={simplifiedCount}
                          disabled={isLoadingSimplified}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Server-Side Simplified Debts View */}
              {useServerSimplification && !isLoadingSimplified && simplifiedDebts.length > 0 && (
                <Card className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <SparklesIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">Simplified Debts</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Optimized transactions using Min-Cost Max-Flow algorithm
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {simplifiedDebts.map((debt, index) => (
                        <div
                          key={`${debt.from_user_id}-${debt.to_user_id}-${index}`}
                          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-2 rounded-lg bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-12 w-12 shrink-0 border-2 border-background">
                              <AvatarImage src={debt.from_user_avatar || undefined} />
                              <AvatarFallback className="text-sm font-semibold">
                                {getInitials(debt.from_user_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-base truncate">{debt.from_user_name}</p>
                              <p className="text-xs text-muted-foreground">Pays</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="secondary" className="text-base font-bold px-4 py-1.5 bg-background border-2">
                              {formatNumber(debt.amount)} ₫
                            </Badge>
                            <ArrowRightIcon className="h-6 w-6 text-primary shrink-0" />
                          </div>

                          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                            <div className="text-right min-w-0 flex-1">
                              <p className="font-semibold text-base truncate">{debt.to_user_name}</p>
                              <p className="text-xs text-muted-foreground">Receives</p>
                            </div>
                            <Avatar className="h-12 w-12 shrink-0 border-2 border-background">
                              <AvatarImage src={debt.to_user_avatar || undefined} />
                              <AvatarFallback className="text-sm font-semibold">
                                {getInitials(debt.to_user_name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Loading State for Simplified Debts */}
              {useServerSimplification && isLoadingSimplified && (
                <Card className="border-2">
                  <CardContent className="py-16 text-center">
                    <div className="space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <div>
                        <p className="font-medium text-base">Calculating simplified debts...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Optimizing transactions using Min-Cost Max-Flow algorithm
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State for Simplified Debts */}
              {useServerSimplification && !isLoadingSimplified && simplifiedDebts.length === 0 && (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-16 text-center">
                    <div className="space-y-4">
                      <div className="text-6xl mb-2">✅</div>
                      <div>
                        <p className="font-semibold text-lg">All settled up!</p>
                        <p className="text-muted-foreground mt-1">No debts to simplify.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Original Balance View (when not using server simplification) */}
              {!useServerSimplification && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BanknoteIcon className="h-5 w-5 text-primary" />
                        Balances
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SimplifiedBalanceView
                        balances={balances}
                        currentUserId={identity?.id || ""}
                        simplifyDebts={group?.simplify_debts || false}
                        onSettleUp={handleSettleUp}
                        currency="VND"
                      />
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5 text-primary" />
                        Payment History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PaymentList groupId={group.id} />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Payment History (always show when using server simplification) */}
              {useServerSimplification && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HistoryIcon className="h-5 w-5 text-primary" />
                      Payment History
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PaymentList groupId={group.id} />
                    </CardContent>
                  </Card>
              )}
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
