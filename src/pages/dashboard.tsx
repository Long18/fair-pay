import React, { useState, useEffect, useMemo } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { FloatingActionButton } from "@/components/dashboard/FloatingActionButton";
import { DashboardSkeleton } from "@/components/dashboard/DashboardStates";
import { BalanceTable } from "@/components/dashboard/BalanceTable";
import { ActivityTable } from "@/components/dashboard/ActivityTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalBalance } from "@/hooks/use-global-balance";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { usePaginatedActivities } from "@/hooks/use-paginated-activities";
import { useTranslation } from "react-i18next";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const globalBalance = useGlobalBalance();
  const { data: debts = [], isLoading: debtsLoading } = useAggregatedDebts();
  const {
    items: activities,
    metadata: activitiesMetadata,
    setPage: setActivitiesPage,
    isLoading: activitiesLoading
  } = usePaginatedActivities({ pageSize: 10 });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!globalBalance.isLoading && !debtsLoading && !activitiesLoading) {
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [globalBalance.isLoading, debtsLoading, activitiesLoading]);

  const isAuthenticated = !!identity;

  // Process debts for balance table
  const balances = useMemo(() => {
    return debts.map(d => ({
      counterparty_id: d.counterparty_id,
      counterparty_name: d.counterparty_name,
      counterparty_avatar_url: d.counterparty_avatar_url,
      amount: d.amount,
      i_owe_them: d.i_owe_them,
    }));
  }, [debts]);

  return (
    <>
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <Tabs defaultValue="balances" className="space-y-4">
          <TabsList>
            <TabsTrigger value="balances">{t('balances.title', 'Balances')}</TabsTrigger>
            <TabsTrigger value="activity">{t('dashboard.recentActivity', 'Activity')}</TabsTrigger>
          </TabsList>

          <TabsContent value="balances" className="space-y-4">
            <BalanceTable balances={balances} disabled={!isAuthenticated} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityTable
              activities={activities}
              metadata={activitiesMetadata}
              onPageChange={setActivitiesPage}
              disabled={!isAuthenticated}
            />
          </TabsContent>
        </Tabs>
      )}

      <FloatingActionButton disabled={!isAuthenticated} />
    </>
  );
};
