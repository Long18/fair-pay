import React, { useState, useEffect } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardTopCards } from "@/components/dashboard/DashboardTopCards";
import { DashboardActionsList } from "@/components/dashboard/DashboardActionsList";
import { DashboardDenseTable } from "@/components/dashboard/DashboardDenseTable";
import { DashboardSkeleton, DashboardEmptyState } from "@/components/dashboard/DashboardStates";
import { useGlobalBalance } from "@/hooks/use-global-balance";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const globalBalance = useGlobalBalance();
  const { data: debts = [] } = useAggregatedDebts();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!globalBalance.isLoading) {
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [globalBalance.isLoading]);

  const hasData = debts.length > 0;
  const isAuthenticated = !!identity;

  return (
    <div className="space-y-8">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Hero Row */}
          <DashboardHero />

          {/* Top Cards Row */}
          <DashboardTopCards disabled={!isAuthenticated} />

          {/* Bottom Section: Asymmetric Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column (Actions) - ~40% (4/12 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <DashboardActionsList disabled={!isAuthenticated} />
            </div>

            {/* Right Column (Data) - ~60% (8/12 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {hasData ? <DashboardDenseTable disabled={!isAuthenticated} /> : <DashboardEmptyState disabled={!isAuthenticated} />}
            </div>

          </div>
        </>
      )}
    </div>
  );
};
