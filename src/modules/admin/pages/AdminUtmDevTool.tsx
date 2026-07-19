import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { DEFAULT_UTM_SHARE_CONFIG } from "@/lib/utm-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircleIcon, ZapIcon } from "@/components/ui/icons";
import { AdminPageHeader } from "../components/AdminPageHeader";
import type { UtmPerformanceResponse } from "../types";
import {
  getInitialFilters,
  optionalFilter,
  toIsoStart,
  toIsoEnd,
  type FilterState,
} from "./admin-utm/helpers";
import {
  FilterPanel,
  BuilderTab,
  useShareConfig,
  MetricsTab,
  RecentSharesTab,
} from "./admin-utm/panels";

export function AdminUtmDevTool({ embedded = false }: { embedded?: boolean }) {
  const [filters, setFilters] = useState<FilterState>(() => getInitialFilters());

  const rpcFilters = useMemo(
    () => ({
      fromIso: toIsoStart(filters.dateFrom),
      toIso: toIsoEnd(filters.dateTo),
      source: optionalFilter(filters.source),
      campaign: optionalFilter(filters.campaign),
      medium: optionalFilter(filters.medium),
      entityType: optionalFilter(filters.entityType),
      userId: optionalFilter(filters.userId),
    }),
    [filters],
  );

  const configQuery = useShareConfig();
  const config = configQuery.data ?? DEFAULT_UTM_SHARE_CONFIG;

  const performanceQuery = useQuery({
    queryKey: ["admin", "utm-performance", rpcFilters],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_utm_performance", {
        p_from: rpcFilters.fromIso,
        p_to: rpcFilters.toIso,
        p_source: rpcFilters.source,
        p_campaign: rpcFilters.campaign,
        p_medium: rpcFilters.medium,
        p_entity_type: rpcFilters.entityType,
        p_user_id: rpcFilters.userId,
      });
      if (error) throw error;
      return data as UtmPerformanceResponse;
    },
    staleTime: 30_000,
  });

  const refetchAll = () => {
    void configQuery.refetch();
    void performanceQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Share Links"
        description="Build compact share URLs, inspect decoded attribution, and monitor performance."
        density={embedded ? "section" : "page"}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              <ZapIcon className="mr-1 h-3 w-3" />
              compact ref
            </Badge>
            <Badge variant="outline" className="text-xs">legacy links accepted</Badge>
          </div>
        }
      />

      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        isFetching={performanceQuery.isFetching || configQuery.isFetching}
        onRefresh={refetchAll}
      />

      {configQuery.isError || performanceQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Share data unavailable</AlertTitle>
          <AlertDescription className="text-xs">
            Builder is using fallback config. Metrics may be incomplete until the RPC responds.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="builder" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder" className="text-xs">Builder</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">Recent shares</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <BuilderTab config={config} />
        </TabsContent>
        <TabsContent value="metrics">
          <MetricsTab data={performanceQuery.data} isLoading={performanceQuery.isLoading} />
        </TabsContent>
        <TabsContent value="recent">
          <RecentSharesTab rows={performanceQuery.data?.recent_shares ?? []} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Older campaign links still work — new shares use a single compact <code className="rounded bg-muted px-1 py-0.5 font-mono">ref</code> parameter.
      </p>
    </div>
  );
}
