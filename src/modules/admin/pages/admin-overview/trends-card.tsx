import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ArrowRightIcon } from "@/components/ui/icons";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatNumber } from "@/lib/locale-utils";
import { useAdminTranslation } from "../../i18n";
import {
  PERIOD_DAYS,
  useCategoryBreakdown,
  useExpenseTrend,
  useRegistrationTrend,
  type TrendPeriod,
} from "./hooks";

type TrendTab = "spending" | "registrations" | "categories";

/** Shared by the chart and the activity list so both cards line up on lg. */
export const OVERVIEW_PANEL_HEIGHT = "h-[240px]";

const PERIODS: TrendPeriod[] = ["7d", "30d", "90d"];

function toCategoryKey(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export function OverviewTrendsCard({ locale }: { locale: string }) {
  const { tAdmin } = useAdminTranslation();
  const [tab, setTab] = useState<TrendTab>("spending");
  const [period, setPeriod] = useState<TrendPeriod>("30d");

  const { data: expenseTrend, isLoading: trendLoading } = useExpenseTrend(
    locale,
    tab === "spending",
    PERIOD_DAYS[period],
  );
  const { data: registrations, isLoading: regLoading } = useRegistrationTrend(
    locale,
    tab === "registrations",
  );
  const { data: categories, isLoading: catLoading } = useCategoryBreakdown(tab === "categories");

  const expenseChartConfig = useMemo(
    () =>
      ({
        total: { label: tAdmin("overview.expenseChartLabel"), color: "var(--chart-1)" },
      }) satisfies ChartConfig,
    [tAdmin],
  );

  const registrationChartConfig = useMemo(
    () =>
      ({
        count: { label: tAdmin("overview.registrationChartLabel"), color: "var(--chart-positive)" },
      }) satisfies ChartConfig,
    [tAdmin],
  );

  const categoryChartConfig = useMemo(
    () =>
      (categories ?? []).reduce((cfg, item) => {
        cfg[toCategoryKey(item.category)] = { label: item.category, color: item.fill };
        return cfg;
      }, {} as ChartConfig),
    [categories],
  );

  const pieData = useMemo(
    () =>
      (categories ?? []).map((item) => ({
        category: toCategoryKey(item.category),
        label: item.category,
        amount: item.amount,
        fill: item.fill,
      })),
    [categories],
  );
  const pieTotal = pieData.reduce((sum, d) => sum + d.amount, 0);

  const periodCaption =
    period === "7d"
      ? tAdmin("layout.insights.overview.last7Days")
      : period === "90d"
        ? tAdmin("layout.insights.overview.last90Days")
        : tAdmin("overview.last30Days");

  const caption =
    tab === "spending"
      ? periodCaption
      : tab === "registrations"
        ? tAdmin("overview.last12Weeks")
        : tAdmin("overview.allExpensesByCategory");

  return (
    <Card className="gap-3 py-4 lg:col-span-8">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TrendTab)} className="flex-1 gap-3">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-4 pb-0">
          <TabsList className="h-8" aria-label={tAdmin("overview.trends")}>
            <TabsTrigger value="spending" className="px-2.5 text-xs">
              {tAdmin("overview.expenseTrend")}
            </TabsTrigger>
            <TabsTrigger value="registrations" className="px-2.5 text-xs">
              {tAdmin("overview.newRegistrations")}
            </TabsTrigger>
            <TabsTrigger value="categories" className="px-2.5 text-xs">
              {tAdmin("overview.categoryBreakdown")}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{caption}</span>
            {tab === "spending" ? (
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={period}
                onValueChange={(v) => v && setPeriod(v as TrendPeriod)}
                aria-label={tAdmin("layout.insights.overview.period")}
              >
                {PERIODS.map((p) => (
                  <ToggleGroupItem key={p} value={p} className="h-7 px-2.5 text-xs">
                    {p}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="px-4">
          <TabsContent value="spending" className={OVERVIEW_PANEL_HEIGHT}>
            {trendLoading ? (
              <LoadingBeam text={tAdmin("overview.loadingChart")} className="h-full" />
            ) : (
              <ChartContainer config={expenseChartConfig} className="aspect-auto h-full w-full">
                <AreaChart data={expenseTrend ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    width={34}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                        )}
                      />
                    }
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} fill="url(#expenseGradient)" />
                </AreaChart>
              </ChartContainer>
            )}
          </TabsContent>

          <TabsContent value="registrations" className={OVERVIEW_PANEL_HEIGHT}>
            {regLoading ? (
              <LoadingBeam text={tAdmin("common.loading")} className="h-full" />
            ) : (
              <ChartContainer config={registrationChartConfig} className="aspect-auto h-full w-full">
                <RechartsBarChart data={registrations ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={30} allowDecimals={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-medium">
                            {tAdmin("overview.usersCount", { count: Number(value) })}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </TabsContent>

          <TabsContent value="categories" className={OVERVIEW_PANEL_HEIGHT}>
            {catLoading ? (
              <LoadingBeam text={tAdmin("common.loading")} className="h-full" />
            ) : !pieData.length ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {tAdmin("common.noData")}
              </p>
            ) : (
              <div className="grid h-full grid-cols-[minmax(0,200px)_minmax(0,1fr)] items-center gap-4">
                <div className="relative h-full">
                  <ChartContainer config={categoryChartConfig} className="aspect-auto h-full w-full">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelKey="category"
                            formatter={(value) => (
                              <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                            )}
                          />
                        }
                      />
                      <Pie data={pieData} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius="58%" outerRadius="90%">
                        {pieData.map((entry) => (
                          <Cell key={entry.category} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold tabular-nums">{formatNumber(pieTotal)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {tAdmin("layout.insights.overview.total")}
                    </span>
                  </div>
                </div>
                <ScrollArea className="h-full pr-2">
                  <ul className="space-y-1.5 py-1 text-sm">
                    {pieData.map((item) => {
                      const pct = pieTotal > 0 ? Math.round((item.amount / pieTotal) * 100) : 0;
                      return (
                        <li key={item.category} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.fill }} aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <span className="tabular-nums text-muted-foreground">{formatNumber(item.amount)} ₫</span>
                          <span className="w-9 text-right text-xs font-semibold tabular-nums">{pct}%</span>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      <CardFooter className="border-t px-4 [.border-t]:pt-3">
        <Link
          to={tab === "registrations" ? "/admin/people" : "/admin/transactions"}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {tab === "registrations" ? tAdmin("overview.viewAllUsers") : tAdmin("overview.viewTransactionDetails")}
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}
