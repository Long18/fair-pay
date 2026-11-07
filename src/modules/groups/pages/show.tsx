import { useState, useMemo, useCallback, useEffect } from "react";
import { useOne, useList, useGo, useGetIdentity } from "@refinedev/core";
import { useInstantCreate, useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import { useTrackEvent } from "@/hooks/use-track-event";
import { useHaptics } from "@/hooks/use-haptics";
import { useLocation, useParams, useSearchParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Group, GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { AddMemberModal } from "../components/add-member-modal";
import { useBalanceCalculation } from "@/modules/payments";
import { GroupShowHeader } from "../components/show/group-show-header";
import { GroupShowSummaryStrip } from "../components/show/group-show-summary-strip";
import {
  GroupShowActivityTab,
  GroupShowBalancesTab,
  GroupShowMembersTab,
  GroupShowRecurringTab,
} from "../components/show/group-show-tab-panels";
import { useSimplifyDebtsSetting } from "../hooks/use-simplify-debts-setting";
import { useSimplifiedDebts } from "@/hooks/balance/use-simplified-debts";
import { useSettleAllGroupDebts } from "@/hooks/use-bulk-operations";
import { useCategoryBreakdown } from "@/hooks/analytics/use-category-breakdown";
import { SettleAllDialog } from "@/components/bulk-operations/SettleAllDialog";
import { QuickSettlementDialog } from "@/components/payments/quick-settlement-dialog";
import { PaymentMethod } from "@/lib/payment-methods";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
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
} from "@/components/ui/alert-dialog";
import {
  ReceiptIcon,
  RepeatIcon,
  UsersIcon,
  BanknoteIcon,
  ArchiveIcon,
  ShareIcon,
  Loader2Icon,
} from "@/components/ui/icons";
import { ScrollReveal } from "@/lib/motion";
import { useTranslation } from "react-i18next";
import { Breadcrumb, createBreadcrumbs } from "@/components/refine-ui/layout/breadcrumb";
import { SwipeableTabs, PullToRefresh } from "@/modules/profile";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { JoinRequestsList } from "../components/join-requests-list";
import { SharePlatformPicker } from "@/components/share/share-platform-picker";

export const GroupShow = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { track } = useTrackEvent();
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

  useEffect(() => {
    const hash = location.hash;
    if (isLoadingGroup || hash !== "#group-join-requests" || !isAdmin) return;
    const timer = setTimeout(() => {
      document.getElementById("group-join-requests")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [location.hash, isAdmin, isLoadingGroup]);

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

  useEffect(() => {
    if (group?.id) {
      track({ eventName: 'group_detail_opened', groupId: group.id });
    }
  }, [group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const myNetBalance = useMemo(() => {
    if (!identity?.id) return 0;
    const row = balances.find((b) => b.user_id === identity.id);
    return row?.balance ?? 0;
  }, [balances, identity?.id]);

  const topCounterpartyRows = useMemo(() => {
    if (!identity?.id) return [];
    return balances
      .filter((b) => b.user_id !== identity.id && b.balance !== 0)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 2);
  }, [balances, identity?.id]);

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
                setSelectedSettlement((prev) =>
                  prev ? { ...prev, amount: remaining } : prev,
                );
                setQuickSettleDialogOpen(true);
              },
            },
          });
        }, 1500);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to record payment: ${message}`);
      throw error;
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

  const handleShare = () => {
    tap();
    track({ eventName: 'group_share_clicked', groupId: id });
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

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const tabs = ["activity", "balances", "members", ...((!isArchived || canManage) ? ["recurring"] : [])];
  const membersForList = allMembers.map((m: GroupMember & { profiles?: Profile }) => ({
    ...m,
    profile: m.profiles,
  }));

  const tabPanelProps = {
    groupId: group.id,
    groupCreatedBy: group.created_by,
    isArchived,
    canManage,
    isAdmin,
    identityId: identity?.id || "",
    expenses,
    payments,
    balances,
    enhancedActivities,
    isLoadingActivities,
    categoryBreakdown,
    totalExpenseAmount,
    allMembers: membersForList,
    memberStats,
    isLoadingMembers,
    useServerSimplification,
    simplifiedCount: simplifiedCount || 0,
    canToggle,
    isLoadingSimplified,
    isUpdatingSimplification: isUpdatingSimplification,
    onToggleSimplification: toggleSimplification,
    onSettleUp: handleSettleUp,
    onRemoveMember: handleRemoveMember,
    onToggleRole: handleToggleRole,
    onAddMember: () => setAddMemberModalOpen(true),
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="container mx-auto max-w-4xl px-4 py-4 pb-20 sm:py-8 sm:pb-8">
        <div className="space-y-5">
          <Breadcrumb
            items={[
              createBreadcrumbs.home(),
              createBreadcrumbs.groups(),
              createBreadcrumbs.groupDetail(group.name),
            ]}
          />

          <GroupShowHeader
            group={group}
            membersList={membersList}
            memberCount={allMembers.length}
            isArchived={isArchived}
            canManage={canManage}
            isAdmin={isAdmin}
            isCreator={isCreator}
            unsettledCount={unsettledCount}
            onBack={() => {
              tap();
              go({ to: "/connections?tab=groups" });
            }}
            onAddExpense={() => {
              tap();
              go({ to: `/groups/${group.id}/expenses/create` });
            }}
            onSettleAll={() => {
              tap();
              setSettleAllDialogOpen(true);
            }}
            onEdit={() => go({ to: `/groups/edit/${group.id}` })}
            onAddMember={() => setAddMemberModalOpen(true)}
            onArchiveToggle={() => setShowArchiveDialog(true)}
            onDelete={() => setShowDeleteDialog(true)}
            shareTrigger={
              <SharePlatformPicker
                shareUrl={() => `${window.location.origin}/share/groups/${id}`}
                destinationUrl={() => `${window.location.origin}/groups/show/${id}`}
                title={group?.name || "Group"}
                text={`Check out ${group?.name} on FairPay`}
                entityType="group"
                entityId={id}
                campaign="group_invite"
                content="group_detail_invite_button"
                templateKey="group_detail_invite_button"
                copyMessage={t("common.linkCopied", "Link copied to clipboard")}
                errorMessage={t("common.shareError", "Failed to share link")}
                trigger={
                  <Button
                    onClick={handleShare}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "min-h-9 min-w-9 shrink-0 rounded-none shadow-none",
                      canManage ? "rounded-l-lg" : "rounded-lg"
                    )}
                    aria-label={t("common.share", "Share")}
                  >
                    <ShareIcon size={16} />
                  </Button>
                }
              />
            }
          />

          <GroupShowSummaryStrip
            myNetBalance={myNetBalance}
            expenseCount={expenses.length}
            memberCount={allMembers.length}
            topCounterpartyRows={topCounterpartyRows}
          />

          {isArchived && !canManage ? (
            <Card className="rounded-xl border border-amber-300/80 bg-amber-50/80 shadow-none dark:bg-amber-950/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <ArchiveIcon className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      {t("groups.archivedTitle", "This group has been archived")}
                    </p>
                    <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
                      {t(
                        "groups.archivedDescription",
                        "You can view balances and members, but cannot add or view expenses."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isAdmin && id ? (
            <div id="group-join-requests">
              <JoinRequestsList groupId={id} onRequestProcessed={() => membersQuery.refetch()} />
            </div>
          ) : null}

          <ScrollReveal direction="up" className="w-full">
            <Tabs variant="pill" value={activeTab} onValueChange={handleTabChange} className="w-full gap-4">
              <div className="flex w-full items-center justify-center px-1 sm:px-0">
                <TabsList
                  className={cn(
                    "grid h-auto w-full max-w-2xl gap-1 overflow-hidden rounded-xl border border-border bg-muted/40 p-1",
                  )}
                  style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                >
                  <TabsTrigger
                    value="activity"
                    className="min-h-9 gap-1 rounded-md px-1.5 text-[10px] focus-visible:ring-offset-0 sm:min-h-10 sm:px-2 sm:text-xs"
                  >
                    <ReceiptIcon size={14} className="shrink-0 sm:size-4" />
                    <span className="truncate">{t("groups.tabs.activity", "Activity")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="balances"
                    className="min-h-9 gap-1 rounded-md px-1.5 text-[10px] focus-visible:ring-offset-0 sm:min-h-10 sm:px-2 sm:text-xs"
                  >
                    <BanknoteIcon size={14} className="shrink-0 sm:size-4" />
                    <span className="truncate">{t("groups.tabs.balances", "Balances")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="members"
                    className="min-h-9 gap-1 rounded-md px-1.5 text-[10px] focus-visible:ring-offset-0 sm:min-h-10 sm:px-2 sm:text-xs"
                  >
                    <UsersIcon size={14} className="shrink-0 sm:size-4" />
                    <span className="truncate">{t("groups.tabs.members", "Members")}</span>
                  </TabsTrigger>
                  {(!isArchived || canManage) && (
                    <TabsTrigger
                      value="recurring"
                      className="min-h-9 gap-1 rounded-md px-1.5 text-[10px] focus-visible:ring-offset-0 sm:min-h-10 sm:px-2 sm:text-xs"
                    >
                      <RepeatIcon size={14} className="shrink-0 sm:size-4" />
                      <span className="truncate max-sm:hidden">
                        {t("groups.tabs.recurringExpenses", "Recurring Expenses")}
                      </span>
                      <span className="truncate sm:hidden">{t("groups.tabs.recurring", "Recurring")}</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <SwipeableTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} className="mt-0">
                <GroupShowActivityTab {...tabPanelProps} />
                <GroupShowBalancesTab {...tabPanelProps} />
                <GroupShowMembersTab {...tabPanelProps} />
                {(!isArchived || canManage) && <GroupShowRecurringTab groupId={group.id} />}
              </SwipeableTabs>
            </Tabs>
          </ScrollReveal>
        </div>

        {/* Modals & Dialogs */}
        <AddMemberModal
          groupId={group.id}
          open={addMemberModalOpen}
          onOpenChange={setAddMemberModalOpen}
          onSuccess={() => {
            track({ eventName: 'group_member_invite_success', groupId: group.id });
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
