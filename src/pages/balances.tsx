import React from "react";
import { useGetIdentity } from "@refinedev/core";
import { useAggregatedDebts, type AggregatedDebt } from "@/hooks/use-aggregated-debts";
import { SimplifiedDebts } from "@/components/dashboard/simplified-debts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Profile } from "@/modules/profile/types";
import { formatNumber } from "@/lib/locale-utils";

/**
 * Balances Page - Shows detailed view of all debts and credits
 * Provides clear "Who owes whom" information with actionable settle-up options
 */
export const BalancesPage = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { data: debts = [], isLoading } = useAggregatedDebts();

  const iOwe = debts.filter((d: AggregatedDebt) => d.i_owe_them);
  const owedToMe = debts.filter((d: AggregatedDebt) => !d.i_owe_them);

  const totalIOwe = iOwe.reduce((sum: number, d: AggregatedDebt) => sum + d.amount, 0);
  const totalOwedToMe = owedToMe.reduce((sum: number, d: AggregatedDebt) => sum + d.amount, 0);

  return (
    <div className="min-h-screen bg-[#FCFCFC]">
      <div className="container max-w-4xl py-8 px-4 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#1F1F1F]">
              All Balances
            </h1>
            <p className="text-[#828282] mt-1">
              Complete overview of your debts and credits
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-[#EB5757]/20 bg-[#EB5757]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#828282]">
                  Total You Owe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#EB5757]">
                  {formatNumber(totalIOwe)} ₫
                </div>
                <p className="text-xs text-[#828282] mt-1">
                  to {iOwe.length} {iOwe.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#6FCF97]/20 bg-[#6FCF97]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#828282]">
                  Total Owed to You
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#6FCF97]">
                  {formatNumber(totalOwedToMe)} ₫
                </div>
                <p className="text-xs text-[#828282] mt-1">
                  from {owedToMe.length} {owedToMe.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* You Owe Section */}
          {iOwe.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-[#1F1F1F] mb-3">
                You Owe
              </h2>
              <SimplifiedDebts
                debts={iOwe}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Owed to You Section */}
          {owedToMe.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-[#1F1F1F] mb-3">
                Owed to You
              </h2>
              <SimplifiedDebts
                debts={owedToMe}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Empty State */}
          {debts.length === 0 && !isLoading && (
            <Card className="border-[#F2F2F2]">
              <CardContent className="py-16 text-center">
                <div className="space-y-3">
                  <div className="text-6xl">✅</div>
                  <h3 className="text-xl font-bold text-[#1F1F1F]">
                    All Settled Up!
                  </h3>
                  <p className="text-[#828282]">
                    You have no outstanding debts or credits
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
