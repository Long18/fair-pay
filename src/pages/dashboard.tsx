import React, { useState, useEffect } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardTopCards } from "@/components/dashboard/DashboardTopCards";
import { FloatingActionButton } from "@/components/dashboard/FloatingActionButton";
import { DashboardDenseTable } from "@/components/dashboard/DashboardDenseTable";
import { DashboardSkeleton, DashboardEmptyState } from "@/components/dashboard/DashboardStates";
import { BalanceFeed } from "@/components/dashboard/BalanceFeed";
import { useGlobalBalance } from "@/hooks/use-global-balance";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const globalBalance = useGlobalBalance();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!globalBalance.isLoading) {
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [globalBalance.isLoading]);

  const isAuthenticated = !!identity;

  return (
    <div className="space-y-8">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Recent Activity with Debt Information */}
          <DashboardDenseTable disabled={!isAuthenticated} />

          {/* Financial Overview Cards */}
          <DashboardTopCards disabled={!isAuthenticated} />
        </>
      )}

      {/* Floating Action Button - Always visible */}
      <FloatingActionButton disabled={!isAuthenticated} />
    </div>
  );
};
