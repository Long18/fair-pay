import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { DEFAULT_UTM_SHARE_CONFIG } from "@/lib/utm-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ActivityIcon,
  AlertCircleIcon,
  InfoIcon,
  LinkIcon,
  PieChartIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { useAdminTranslation } from "../i18n";
import type { UtmPerformanceResponse } from "../types";
import {
  getInitialFilters,
  optionalFilter,
  toIsoStart,
  toIsoEnd,
  type FilterState,
} from "./admin-utm/helpers";
import { FilterBar, BuilderTab } from "./admin-utm/panels";
import { useShareConfig } from "./admin-utm/share-config";
import { MetricsTab, RecentSharesTab } from "./admin-utm/metrics";

function ShareLinksAboutPopover() {
  const { tAdmin } = useAdminTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label={tAdmin("layout.devtoolTools.utm.about")}
        >
          <InfoIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 p-3 text-xs">
        <p className="font-medium">Share Links</p>
        <p className="text-muted-foreground">
          Build compact share URLs, inspect decoded attribution, and monitor performance.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            <ZapIcon className="mr-1 h-3 w-3" />
            compact ref
          </Badge>
          <Badge variant="outline" className="text-xs">legacy links accepted</Badge>
        </div>
        <p className="text-muted-foreground">
          Older campaign links still work — new shares use a single compact{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">ref</code> parameter.
        </p>
      </PopoverContent>
    </Popover>
  );
}

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

  const recentShares = performanceQuery.data?.recent_shares ?? [];

  return (
    <div className="space-y-3">
      {!embedded ? (
        <AdminPageHeader
          title="Share Links"
          description="Build compact share URLs, inspect decoded attribution, and monitor performance."
        />
      ) : null}

      <Tabs defaultValue="builder" className="gap-3">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="max-w-full justify-start overflow-x-auto scrollbar-none">
            <TabsTrigger value="builder" className="flex-none px-3 text-xs">
              <LinkIcon className="h-3.5 w-3.5" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex-none px-3 text-xs">
              <PieChartIcon className="h-3.5 w-3.5" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-none px-3 text-xs">
              <ActivityIcon className="h-3.5 w-3.5" />
              Recent shares
              {recentShares.length ? (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
                  {recentShares.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              isFetching={performanceQuery.isFetching || configQuery.isFetching}
              onRefresh={refetchAll}
            />
            <ShareLinksAboutPopover />
          </div>
        </div>

        {configQuery.isError || performanceQuery.isError ? (
          <Alert variant="destructive" className="py-2">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle className="text-sm">Share data unavailable</AlertTitle>
            <AlertDescription className="text-xs">
              Builder is using fallback config. Metrics may be incomplete until the RPC responds.
            </AlertDescription>
          </Alert>
        ) : null}

        <TabsContent value="builder">
          <BuilderTab config={config} />
        </TabsContent>
        <TabsContent value="metrics">
          <MetricsTab data={performanceQuery.data} isLoading={performanceQuery.isLoading} />
        </TabsContent>
        <TabsContent value="recent">
          <RecentSharesTab rows={recentShares} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
