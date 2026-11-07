import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { MemberList } from "../member-list";
import { RecurringExpenseList } from "@/modules/expenses";
import { SimplifiedBalanceView, PaymentList } from "@/modules/payments";
import type { UserBalance } from "@/modules/payments/types";
import { SimplifiedDebtsToggle } from "@/components/dashboard/stats/SimplifiedDebtsToggle";
import { EnhancedActivityList } from "@/components/dashboard/activity/enhanced-activity-list";
import type { EnhancedActivityItem } from "@/components/dashboard/activity/enhanced-activity-row";
import { CategoryBreakdown } from "@/components/groups/category-breakdown";
import { EmptyBalances } from "@/modules/profile";
import { useHaptics } from "@/hooks/use-haptics";
import { useTrackEvent } from "@/hooks/use-track-event";
import { formatNumber } from "@/lib/locale-utils";
import type { GroupMember } from "../../types";
import type { CategoryData } from "@/hooks/analytics/use-category-breakdown";
import { CheckCircle2Icon, PieChartIcon, PlusIcon } from "@/components/ui/icons";

import type { Profile } from "@/modules/profile/types";

type MemberWithProfile = GroupMember & { profile?: Profile };

type GroupShowTabPanelsProps = {
  groupId: string;
  groupCreatedBy: string;
  isArchived: boolean;
  canManage: boolean;
  isAdmin: boolean;
  identityId: string;
  expenses: unknown[];
  payments: unknown[];
  balances: UserBalance[];
  enhancedActivities: EnhancedActivityItem[];
  isLoadingActivities: boolean;
  categoryBreakdown: CategoryData[];
  totalExpenseAmount: number;
  allMembers: MemberWithProfile[];
  memberStats: Record<string, { expense_count: number; total_paid: number }>;
  isLoadingMembers: boolean;
  useServerSimplification: boolean;
  simplifiedCount: number;
  canToggle: boolean;
  isLoadingSimplified: boolean;
  isUpdatingSimplification: boolean;
  onToggleSimplification: (enabled: boolean) => void;
  onSettleUp: (toUserId: string, amount: number) => void;
  onRemoveMember: (memberId: string) => void;
  onToggleRole: (memberId: string, currentRole: string) => void;
  onAddMember: () => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-xs font-medium text-muted-foreground">{children}</p>;
}

export function GroupShowActivityTab({
  groupId,
  isArchived,
  canManage,
  identityId,
  expenses,
  enhancedActivities,
  isLoadingActivities,
  categoryBreakdown,
  totalExpenseAmount,
}: Pick<
  GroupShowTabPanelsProps,
  | "groupId"
  | "isArchived"
  | "canManage"
  | "identityId"
  | "expenses"
  | "enhancedActivities"
  | "isLoadingActivities"
  | "categoryBreakdown"
  | "totalExpenseAmount"
>) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <TabsContent value="activity" className="mt-0 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <SectionLabel>{t("groups.tabs.activity", "Activity")}</SectionLabel>
          {totalExpenseAmount > 0 ? (
            <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] tabular-nums">
              {formatNumber(totalExpenseAmount)} ₫
            </Badge>
          ) : null}
        </div>
        <Card className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-none">
          <CardContent className="p-0 sm:p-0">
            {expenses.length === 0 && (!isArchived || canManage) ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <p className="text-lg font-semibold tracking-tight">{t("groups.readyToTrack")}</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("groups.addFirstExpense")}</p>
                <Button
                  className="mt-4 min-h-9 gap-1.5"
                  onClick={() => {
                    tap();
                    go({ to: `/groups/${groupId}/expenses/create` });
                  }}
                >
                  <PlusIcon size={16} />
                  {t("expenses.addExpense", "Add Expense")}
                </Button>
              </div>
            ) : (
              <div className="px-2 py-2 sm:px-3 sm:py-3">
                {categoryBreakdown.length > 0 && (!isArchived || canManage) ? (
                  <div className="mb-3 space-y-1.5 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <PieChartIcon size={12} className="text-muted-foreground" aria-hidden />
                      <SectionLabel>{t("groups.spendingByCategory")}</SectionLabel>
                    </div>
                    <CategoryBreakdown
                      breakdown={categoryBreakdown}
                      totalAmount={categoryBreakdown.reduce((sum, c) => sum + c.amount, 0)}
                      currency="₫"
                      variant="compact"
                    />
                  </div>
                ) : null}
                <EnhancedActivityList
                  activities={enhancedActivities}
                  currentUserId={identityId}
                  currency="VND"
                  isLoading={isLoadingActivities}
                  showSummary={false}
                  showFilters
                  showSort
                  showTimeGrouping
                  compactControls
                  variant="group"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

export function GroupShowBalancesTab({
  groupId,
  identityId,
  expenses,
  payments,
  balances,
  allMembers,
  useServerSimplification,
  simplifiedCount,
  canToggle,
  isLoadingSimplified,
  isUpdatingSimplification,
  onToggleSimplification,
  onSettleUp,
}: Pick<
  GroupShowTabPanelsProps,
  | "groupId"
  | "identityId"
  | "expenses"
  | "payments"
  | "balances"
  | "allMembers"
  | "useServerSimplification"
  | "simplifiedCount"
  | "canToggle"
  | "isLoadingSimplified"
  | "isUpdatingSimplification"
  | "onToggleSimplification"
  | "onSettleUp"
>) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <TabsContent value="balances" className="mt-0 space-y-2">
      <SectionLabel>{t("groups.tabs.balances", "Balances")}</SectionLabel>
      <Card className="rounded-xl border border-border/60 bg-card shadow-none">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {allMembers.length >= 3 && balances.some((b) => b.balance !== 0) ? (
            <div>
              {canToggle ? (
                <SimplifiedDebtsToggle
                  isSimplified={useServerSimplification}
                  onToggle={onToggleSimplification}
                  rawCount={balances.filter((b) => b.balance !== 0).length}
                  simplifiedCount={simplifiedCount || balances.filter((b) => b.balance !== 0).length}
                  disabled={isLoadingSimplified || isUpdatingSimplification}
                  isUpdating={isUpdatingSimplification}
                />
              ) : useServerSimplification ? (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium">{t("debts.minimizeTransfers", "Minimize transfers")}</span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {t("debts.minimizedActive", "This group settles with fewer transfers.")}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {balances.every((b) => b.balance === 0) && expenses.length > 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/30 px-4 py-6 text-center">
              <CheckCircle2Icon className="mb-2 h-5 w-5 text-semantic-positive" aria-hidden />
              <p className="text-sm font-medium tracking-tight">
                {t("dashboard.groupDebtFreeTitle", "Group is debt-free")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dashboard.groupDebtFreeDescription", "{{count}} expense(s) tracked, all balances cleared.", {
                  count: expenses.length,
                })}
              </p>
            </div>
          ) : balances.length === 0 ? (
            <EmptyBalances
              onAction={() => {
                tap();
                go({ to: `/groups/${groupId}/expenses/create` });
              }}
            />
          ) : (
            <div className="space-y-4">
              <SimplifiedBalanceView
                balances={balances}
                currentUserId={identityId}
                simplifyDebts={useServerSimplification}
                onSettleUp={onSettleUp}
                currency="VND"
                showSummaryCards={false}
              />
              {payments.length > 0 ? (
                <div className="space-y-2 border-t border-border/60 pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("payments.history", "Payment History")}
                  </p>
                  <PaymentList groupId={groupId} currency="VND" />
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export function GroupShowMembersTab({
  groupId,
  groupCreatedBy,
  isArchived,
  canManage,
  isAdmin,
  identityId,
  allMembers,
  memberStats,
  isLoadingMembers,
  onRemoveMember,
  onToggleRole,
  onAddMember,
}: Pick<
  GroupShowTabPanelsProps,
  | "groupId"
  | "groupCreatedBy"
  | "isArchived"
  | "canManage"
  | "isAdmin"
  | "identityId"
  | "allMembers"
  | "memberStats"
  | "isLoadingMembers"
  | "onRemoveMember"
  | "onToggleRole"
  | "onAddMember"
>) {
  const { t } = useTranslation();
  const { track } = useTrackEvent();
  const { tap } = useHaptics();

  return (
    <TabsContent value="members" className="mt-0 space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <SectionLabel>{t("groups.tabs.members", "Members")}</SectionLabel>
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] tabular-nums">
            {allMembers.length}
          </Badge>
        </div>
        {isAdmin && (!isArchived || canManage) ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-8 gap-1.5 text-xs"
            onClick={() => {
              tap();
              track({ eventName: "group_member_invite_clicked", groupId });
              onAddMember();
            }}
          >
            <PlusIcon size={14} />
            {t("groups.addMember", "Add Member")}
          </Button>
        ) : null}
      </div>
      <Card className="rounded-xl border border-border/60 bg-card shadow-none" flushList>
        <CardContent className="p-0">
          <MemberList
            members={allMembers}
            currentUserId={identityId}
            creatorId={groupCreatedBy}
            isAdmin={isAdmin}
            onRemoveMember={onRemoveMember}
            onToggleRole={onToggleRole}
            isLoading={isLoadingMembers}
            showPagination={false}
            showStats
            memberStats={memberStats}
            showHeader={false}
            currentGroupId={groupId}
            layout="dense"
          />
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export function GroupShowRecurringTab({ groupId }: { groupId: string }) {
  const { t } = useTranslation();

  return (
    <TabsContent value="recurring" className="mt-0 space-y-2">
      <SectionLabel>{t("groups.tabs.recurringExpenses", "Recurring Expenses")}</SectionLabel>
      <Card className="rounded-xl border border-border/60 bg-card shadow-none">
        <CardContent className="p-4 sm:p-6">
          <RecurringExpenseList groupId={groupId} />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
