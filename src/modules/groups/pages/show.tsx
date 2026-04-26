import { useState, useMemo, useCallback, useEffect } from "react";
import { useOne, useList, useGo, useGetIdentity } from "@refinedev/core";
import { useInstantCreate, useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import { useHaptics } from "@/hooks/use-haptics";
import { useParams, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Group, GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { MemberList } from "../components/member-list";
import { AddMemberModal } from "../components/add-member-modal";
import { RecurringExpenseList } from "@/modules/expenses";
import { SimplifiedBalanceView, PaymentList, useBalanceCalculation } from "@/modules/payments";
import { SimplifiedDebtsToggle } from "@/components/dashboard/stats/SimplifiedDebtsToggle";
import { useSimplifyDebtsSetting } from "../hooks/use-simplify-debts-setting";
import { useSimplifiedDebts } from "@/hooks/balance/use-simplified-debts";
import { useSettleAllGroupDebts } from "@/hooks/use-bulk-operations";
import { useCategoryBreakdown } from "@/hooks/analytics/use-category-breakdown";
import { SettleAllDialog } from "@/components/bulk-operations/SettleAllDialog";
import { QuickSettlementDialog } from "@/components/payments/quick-settlement-dialog";
import { PaymentMethod } from "@/lib/payment-methods";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDate } from "@/lib/locale-utils";
import { toast } from "sonner";
import { CategoryBreakdown } from "@/components/groups/category-breakdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  ReceiptIcon,
  RepeatIcon,
  UsersIcon,
  CalendarIcon,
  CheckCircle2Icon,
  BanknoteIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreVerticalIcon,
  ShareIcon,
  Loader2Icon,
  PieChartIcon,
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Breadcrumb, createBreadcrumbs } from "@/components/refine-ui/layout/breadcrumb";
import { SwipeableTabs, PullToRefresh, EmptyBalances } from "@/modules/profile";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { EnhancedActivityList } from "@/components/dashboard/activity/enhanced-activity-list";
import { JoinRequestsList } from "../components/join-requests-list";

export const GroupShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, setIsRefreshing] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [settleAllDialogOpen, setSettleAllDialogOpen] = useState(false);
  const [quickSettleDialogOpen, setQuickSettleDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<{
    userId: string;
    userName: string;
    amount: number;
  } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const { tap, success, warning } = useHaptics();

  // Tab from URL
  const activeTab = searchParams.get('tab') || 'activity';
  const handleTabChange = (tab: string) => {
    tap();
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };

  const { query: membershipQuery } = useList<GroupMember>({
    resource: "group_members",
    filters: [
      { field: "group_id", operator: "eq", value: id },
      { field: "user_id", operator: "eq", value: identity?.id },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!id && !!identity?.id },
    meta: { select: "id, group_id, user_id, role, joined_at" },
  });

  const { data: membershipData, isLoading: isLoadingMembership } = membershipQuery;

  const currentUserMember = membershipData?.data?.[0];
  const isAdmin = currentUserMember?.role === "admin";
  const canAccessGroupDetails = !!identity?.id && !!currentUserMember;
  const shouldRedirectNonMember =
    !!id &&
    !!identity?.id &&
    !isLoadingMembership &&
    !currentUserMember;

  const { query: groupQuery } = useOne<Group>({
    resource: "groups",
    id: id!,
    meta: { select: "*" },
    queryOptions: { enabled: canAccessGroupDetails },
  });

  const { data: groupData, isLoading: isLoadingGroup } = groupQuery;
  const group = groupData?.data;
  const isCreator = group?.created_by === identity?.id;
  const isArchived = group?.is_archived ?? false;
  const canManage = isAdmin || isCreator;

  const { query: membersQuery } = useList<GroupMember>({
    resource: "group_members",
    filters: [{ field: "group_id", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { enabled: canAccessGroupDetails },
    meta: { select: "*, profiles!user_id(*)" },
  });

  const deleteGroupMutation = useInstantDelete();
  const deleteMemberMutation = useInstantDelete();
  const updateMemberMutation = useInstantUpdate();
  const createPaymentMutation = useInstantCreate();
  const updateGroupMutation = useInstantUpdate();

  const { query: expensesQuery } = useList({
    resource: "expenses",
    filters: [{ field: "group_id", operator: "eq", value: id }],
    meta: { select: "*, expense_splits(*)" },
    queryOptions: {
      enabled: canAccessGroupDetails,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  });

  const { query: paymentsQuery } = useList({
    resource: "payments",
    filters: [{ field: "group_id", operator: "eq", value: id }],
    queryOptions: {
      enabled: canAccessGroupDetails,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  });

  const settleAllMutation = useSettleAllGroupDebts();
  const { data: membersData, isLoading: isLoadingMembers } = membersQuery;
  const allMembers = membersData?.data || [];
  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];

  const {
    isSimplified: useServerSimplification,
    isUpdating: isUpdatingSimplification,
    toggleSimplification,
    canToggle,
  } = useSimplifyDebtsSetting({
    groupId: id!,
    groupData: group,
    isAdmin: canManage,
  });

  const {
    isLoading: isLoadingSimplified,
    transactionCount: simplifiedCount,
  } = useSimplifiedDebts({
    groupId: id,
    enabled: canAccessGroupDetails && useServerSimplification && !!id,
  });

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

  const { breakdown: categoryBreakdown } = useCategoryBreakdown(
    'all_time',
    undefined,
    id,
    { enabled: canAccessGroupDetails }
  );

  const {
    activities: enhancedActivities,
    isLoading: isLoadingActivities,
  } = useEnhancedActivity({ groupId: id, enabled: canAccessGroupDetails });

  useEffect(() => {
    if (!shouldRedirectNonMember || !id) return;

    warning();
    const params = new URLSearchParams({
      tab: "groups",
      joinGroupId: id,
    });

    go({ to: `/connections?${params.toString()}`, type: "replace" });
  }, [go, id, shouldRedirectNonMember, warning]);

  const memberStats = useMemo(() => {
    const stats: Record<string, { expense_count: number; total_paid: number }> = {};
    allMembers.forEach((member: any) => {
      const memberExpenses = expenses.filter((e: any) =>
        (e.expense_splits || []).some((s: any) => s.user_id === member.user_id)
      );
      const totalPaid = expenses
        .filter((e: any) => e.paid_by_user_id === member.user_id)
        .reduce((sum: number, e: any) => sum + e.amount, 0);
      stats[member.user_id] = { expense_count: memberExpenses.length, total_paid: totalPaid };
    });
    return stats;
  }, [allMembers, expenses]);

  const unsettledSplits = expenses.flatMap((e: any) =>
    (e.expense_splits || []).filter((s: any) => !s.is_settled)
  );
  const unsettledCount = unsettledSplits.length;
  const unsettledTotal = unsettledSplits.reduce(
    (sum: number, s: any) => sum + (s.computed_amount - (s.settled_amount || 0)),
    0
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        groupQuery.refetch(),
        membersQuery.refetch(),
        expensesQuery.refetch(),
        paymentsQuery.refetch(),
      ]);
      toast.success(t('common.refreshed', 'Data refreshed'));
    } catch {
      toast.error(t('common.refreshError', 'Failed to refresh'));
    } finally {
      setIsRefreshing(false);
    }
  }, [groupQuery, membersQuery, expensesQuery, paymentsQuery, t]);

  const handleArchiveToggle = () => {
    tap();
    if (!group?.id || !identity?.id) return;
    const newArchived = !isArchived;
    updateGroupMutation.mutate(
      {
        resource: "groups",
        id: group.id,
        values: {
          is_archived: newArchived,
          archived_at: newArchived ? new Date().toISOString() : null,
          archived_by: newArchived ? identity.id : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(newArchived ? "Group archived" : "Group restored");
          groupQuery.refetch();
          setShowArchiveDialog(false);
        },
        onError: (error) => {
          toast.error(`Failed to ${newArchived ? "archive" : "restore"} group: ${error.message}`);
        },
      }
    );
  };

  const handleSettleUp = (toUserId: string, amount: number) => {
    const member = membersList.find(m => m.id === toUserId);
    setSelectedSettlement({ userId: toUserId, userName: member?.full_name || "Unknown", amount });
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
      success();
      toast.success(`Payment of ${formatNumber(data.amount)} ₫ to ${selectedSettlement.userName} recorded!`);
      setQuickSettleDialogOpen(false);
      setSelectedSettlement(null);
      expensesQuery.refetch();
      paymentsQuery.refetch();
      if (data.amount < selectedSettlement.amount) {
        const remaining = selectedSettlement.amount - data.amount;
        setTimeout(() => {
          toast.info(`Remaining balance: ${formatNumber(remaining)} ₫`, {
            action: {
              label: "Pay More",
              onClick: () => {
                setSelectedSettlement({ ...selectedSettlement, amount: remaining });
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

  const handleSettleAll = async () => {
    if (!id) return;
    await settleAllMutation.mutateAsync(
      { groupId: id },
      {
        onSuccess: () => {
          success();
          setSettleAllDialogOpen(false);
          groupQuery.refetch();
          membersQuery.refetch();
          expensesQuery.refetch();
          paymentsQuery.refetch();
        },
      }
    );
  };

  const handleDeleteGroup = () => {
    warning();
    if (!group?.id) return;
    deleteGroupMutation.mutate(
      { resource: "groups", id: group.id },
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
      { resource: "group_members", id: memberId },
      {
        onSuccess: () => { toast.success("Member removed"); membersQuery.refetch(); },
        onError: (error) => { toast.error(`Failed to remove member: ${error.message}`); },
      }
    );
  };

  const handleToggleRole = (memberId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    updateMemberMutation.mutate(
      { resource: "group_members", id: memberId, values: { role: newRole } },
      {
        onSuccess: () => {
          toast.success(`Member ${newRole === "admin" ? "promoted to admin" : "changed to member"}`);
          membersQuery.refetch();
        },
        onError: (error) => { toast.error(`Failed to update role: ${error.message}`); },
      }
    );
  };

  const handleShare = async () => {
    tap();
    const groupUrl = `${window.location.origin}/groups/show/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: group?.name || 'Group',
          text: `Check out ${group?.name} on FairPay`,
          url: groupUrl,
        });
      } else {
        await navigator.clipboard.writeText(groupUrl);
        toast.success(t('common.linkCopied', 'Link copied to clipboard'));
      }
    } catch {
      // User cancelled share
    }
  };

  // Loading state
  if (isLoadingGroup || !group || isLoadingMembership || isLoadingMembers || shouldRedirectNonMember) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2Icon size={32} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const tabs = ["activity", "balances", "members", ...((!isArchived || canManage) ? ["recurring"] : [])];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl pb-20 sm:pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Breadcrumb (Desktop) */}
          <Breadcrumb
            items={[
              createBreadcrumbs.home(),
              createBreadcrumbs.groups(),
              createBreadcrumbs.groupDetail(group.name),
            ]}
          />

          {/* Back + Share */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => { tap(); go({ to: "/connections?tab=groups" }); }}
              className="rounded-lg md:hidden"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              {t('common.back', 'Back')}
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="rounded-lg ml-auto"
            >
              <ShareIcon size={16} className="mr-2 sm:mr-0" />
              <span className="sm:sr-only">{t('common.share', 'Share')}</span>
            </Button>
          </div>

          {/* Group Header */}
          <Card className="rounded-xl overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl" />

              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-6">
                {/* Group Avatar */}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl">
                    <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
                    <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                      {getInitials(group.name)}
                    </AvatarFallback>
                  </Avatar>
                  {isArchived && (
                    <div className="absolute -bottom-1 -right-1 bg-amber-100 border-2 border-background rounded-full p-1">
                      <ArchiveIcon className="h-3.5 w-3.5 text-amber-700" />
                    </div>
                  )}
                </motion.div>

                {/* Group Info */}
                <div className="flex-1 text-center sm:text-left min-w-0 overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 mb-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold line-clamp-2 sm:line-clamp-1 break-words max-w-full" title={group.name}>
                      {group.name}
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start shrink-0">
                      {isArchived && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 rounded-full">
                          Archived
                        </Badge>
                      )}
                      <Badge variant="secondary" className="rounded-full">
                        <UsersIcon className="h-3 w-3 mr-1" />
                        {allMembers.length}
                      </Badge>
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-muted-foreground text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3 mb-3 break-words" title={group.description}>
                      {group.description}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mb-3">
                    <CalendarIcon className="h-3 w-3 inline mr-1" />
                    {t('groups.createdOn', 'Created')} {formatDate(group.created_at, { year: "numeric", month: "short", day: "numeric" })}
                  </p>

                  {/* Member Avatars */}
                  {membersList.length > 0 && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                      <div className="flex items-center">
                        {membersList.slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-background -ml-2 first:ml-0">
                            <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {membersList.length > 5 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background -ml-2 flex items-center justify-center">
                            <span className="text-[10px] font-medium">+{membersList.length - 5}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {membersList.slice(0, 3).map(m => m.full_name.split(' ')[0]).join(', ')}
                        {membersList.length > 3 && ` +${membersList.length - 3}`}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                    {(!isArchived || canManage) && (
                      <Button
                        onClick={() => { tap(); go({ to: `/groups/${group.id}/expenses/create` }); }}
                        variant="default"
                        size="sm"
                        className="rounded-lg"
                      >
                        <PlusIcon size={16} className="mr-2" />
                        {t('expenses.addExpense', 'Add Expense')}
                      </Button>
                    )}
                    {isAdmin && unsettledCount > 0 && (!isArchived || canManage) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => { tap(); setSettleAllDialogOpen(true); }}
                      >
                        <CheckCircle2Icon size={16} className="mr-2" />
                        {t('groups.settleAll', 'Settle All')} ({unsettledCount})
                      </Button>
                    )}

                    {/* More actions dropdown */}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="rounded-lg">
                            <MoreVerticalIcon size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => { tap(); go({ to: `/groups/edit/${group.id}` }); }}>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              {t('groups.editGroup', 'Edit Group')}
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (!isArchived || canManage) && (
                            <DropdownMenuItem onClick={() => { tap(); setAddMemberModalOpen(true); }}>
                              <PlusIcon className="mr-2 h-4 w-4" />
                              {t('groups.addMember', 'Add Member')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { tap(); setShowArchiveDialog(true); }}>
                            {isArchived ? (
                              <>
                                <ArchiveRestoreIcon className="mr-2 h-4 w-4" />
                                {t('groups.restore', 'Restore Group')}
                              </>
                            ) : (
                              <>
                                <ArchiveIcon className="mr-2 h-4 w-4" />
                                {t('groups.archive', 'Archive Group')}
                              </>
                            )}
                          </DropdownMenuItem>
                          {isCreator && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => { warning(); setShowDeleteDialog(true); }}
                                className="text-destructive"
                              >
                                <Trash2Icon className="mr-2 h-4 w-4" />
                                {t('groups.deleteGroup', 'Delete Group')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </Card>

          {/* Archived Banner for regular members */}
          {isArchived && !canManage && (
            <Card className="border-amber-300 bg-amber-50 rounded-xl">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <ArchiveIcon className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900">{t('groups.archivedTitle', 'This group has been archived')}</p>
                    <p className="text-sm text-amber-700">
                      {t('groups.archivedDescription', 'You can view balances and members, but cannot add or view expenses.')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Join Requests for admins */}
          {isAdmin && id && (
            <JoinRequestsList
              groupId={id}
              onRequestProcessed={() => membersQuery.refetch()}
            />
          )}

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 15 }}
            className="w-full"
          >
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full rounded-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                <TabsTrigger value="activity" className="rounded-lg">
                  <ReceiptIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">{t('groups.activity', 'Activity')}</span>
                </TabsTrigger>
                <TabsTrigger value="balances" className="rounded-lg">
                  <BanknoteIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">{t('balances.title', 'Balances')}</span>
                </TabsTrigger>
                <TabsTrigger value="members" className="rounded-lg">
                  <UsersIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">{t('groups.members', 'Members')}</span>
                </TabsTrigger>
                {(!isArchived || canManage) && (
                  <TabsTrigger value="recurring" className="rounded-lg">
                    <RepeatIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                    <span className="hidden lg:inline">{t('expenses.recurring', 'Recurring')}</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <SwipeableTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mt-4"
              >
                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{t('groups.activity', 'Activity')}</CardTitle>
                        {totalExpenseAmount > 0 && (
                          <Badge variant="secondary">
                            {formatNumber(totalExpenseAmount)} ₫
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {expenses.length === 0 && (!isArchived || canManage) ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="text-5xl mb-4">🎉</div>
                          <p className="font-semibold text-lg">{t('groups.readyToTrack', 'Ready to track expenses!')}</p>
                          <p className="text-muted-foreground mt-2 max-w-sm">
                            {t('groups.addFirstExpense', 'Add your first group expense to start splitting costs.')}
                          </p>
                          <Button
                            className="mt-4 rounded-lg"
                            onClick={() => { tap(); go({ to: `/groups/${group.id}/expenses/create` }); }}
                          >
                            <PlusIcon size={16} className="mr-2" />
                            {t('expenses.addExpense', 'Add Expense')}
                          </Button>
                        </div>
                      ) : (
                        <EnhancedActivityList
                          activities={enhancedActivities}
                          currentUserId={identity?.id || ""}
                          currency="VND"
                          isLoading={isLoadingActivities}
                          showSummary={false}
                          showFilters={true}
                          showSort={true}
                          showTimeGrouping={true}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Category Breakdown */}
                  {categoryBreakdown.length > 0 && (!isArchived || canManage) && (
                    <Card className="rounded-xl mt-4">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <PieChartIcon size={16} className="text-primary" />
                          <CardTitle className="text-base">{t('groups.spendingByCategory', 'Spending by Category')}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CategoryBreakdown
                          breakdown={categoryBreakdown}
                          totalAmount={categoryBreakdown.reduce((sum, c) => sum + c.amount, 0)}
                          currency="₫"
                        />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Balances Tab */}
                <TabsContent value="balances" className="mt-0">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>{t('balances.title', 'Balances')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Debt Simplification Toggle */}
                      {canToggle && allMembers.length >= 3 && balances.some(b => b.balance !== 0) && (
                        <div className="mb-4">
                          <SimplifiedDebtsToggle
                            isSimplified={useServerSimplification}
                            onToggle={toggleSimplification}
                            rawCount={balances.filter(b => b.balance !== 0).length}
                            simplifiedCount={simplifiedCount}
                            disabled={isLoadingSimplified || isUpdatingSimplification}
                          />
                        </div>
                      )}

                      {balances.every(b => b.balance === 0) && expenses.length > 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                            <CheckCircle2Icon className="h-5 w-5 text-green-500" />
                          </div>
                          <p className="text-base font-medium tracking-tight">
                            {t('dashboard.groupDebtFreeTitle', 'Group is debt-free')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('dashboard.groupDebtFreeDescription', '{{count}} expense(s) tracked, all balances cleared.', { count: expenses.length })}
                          </p>
                        </div>
                      ) : balances.length === 0 ? (
                        <EmptyBalances onAction={() => { tap(); go({ to: `/groups/${group.id}/expenses/create` }); }} />
                      ) : (
                        <div className="space-y-6">
                          <SimplifiedBalanceView
                            balances={balances}
                            currentUserId={identity?.id || ""}
                            simplifyDebts={useServerSimplification}
                            onSettleUp={handleSettleUp}
                            currency="VND"
                          />
                          {payments.length > 0 && (
                            <div>
                              <h3 className="text-base font-semibold mb-3">{t('payments.history', 'Payment History')}</h3>
                              <PaymentList groupId={group.id} currency="VND" />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Members Tab */}
                <TabsContent value="members" className="mt-0">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CardTitle>{t('groups.members', 'Members')}</CardTitle>
                          <Badge variant="secondary">{allMembers.length}</Badge>
                        </div>
                        {isAdmin && (!isArchived || canManage) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => { tap(); setAddMemberModalOpen(true); }}
                          >
                            <PlusIcon size={16} className="mr-2" />
                            {t('groups.addMember', 'Add Member')}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <MemberList
                        members={allMembers.map((m: any) => ({ ...m, profile: m.profiles }))}
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
                        currentGroupId={id}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Recurring Tab */}
                {(!isArchived || canManage) && (
                  <TabsContent value="recurring" className="mt-0">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle>{t('expenses.recurring', 'Recurring Expenses')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RecurringExpenseList groupId={group.id} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </SwipeableTabs>
            </Tabs>
          </motion.div>
        </motion.div>

        {/* Modals & Dialogs */}
        <AddMemberModal
          groupId={group.id}
          open={addMemberModalOpen}
          onOpenChange={setAddMemberModalOpen}
          onSuccess={() => {
            membersQuery.refetch();
            setAddMemberModalOpen(false);
          }}
        />

        <SettleAllDialog
          open={settleAllDialogOpen}
          onOpenChange={setSettleAllDialogOpen}
          onConfirm={handleSettleAll}
          splitsCount={unsettledCount}
          totalAmount={unsettledTotal}
          isLoading={settleAllMutation.isPending}
        />

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

        {/* Archive Dialog */}
        <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isArchived ? t('groups.restoreTitle', 'Restore Group?') : t('groups.archiveTitle', 'Archive Group?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isArchived
                  ? t('groups.restoreDescription', 'This will restore the group. Members will be able to view expenses and add new ones again.')
                  : t('groups.archiveDescription', 'Archived groups are read-only for members. Admins and the group creator can still manage everything.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveToggle}>
                {isArchived ? t('groups.restore', 'Restore') : t('groups.archive', 'Archive')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('groups.deleteTitle', 'Delete Group?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('groups.deleteDescription', 'This action cannot be undone. This will permanently delete the group and all associated data.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteGroup}>
                {t('common.delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PullToRefresh>
  );
};
