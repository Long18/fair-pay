import { useMemo, useState } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  UsersIcon,
  ActivityIcon,
  ArrowLeftIcon,
  RepeatIcon,
  MailIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { cn } from "@/lib/utils";
import { AdminMetricCard } from "../../components/AdminMetricCard";
import type { UserEmailGroup, TypeEmailGroup, DayEmailPoint } from "./types";
import { useEmailStats, useSentEmails } from "./hooks";

type EmailViewMode = "users" | "types" | "timeline";

export function EmailsTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const [viewMode, setViewMode] = useState<EmailViewMode>("users");
  const [selectedUser, setSelectedUser] = useState<UserEmailGroup | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: emailStats, isLoading: statsLoading } = useEmailStats(enabled);
  const { data: sentEmails, isLoading: emailsLoading } = useSentEmails(enabled);

  const statItems = useMemo(() => [0, 1, 2], []);
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(statItems);

  const groupedByUser = useMemo((): UserEmailGroup[] => {
    if (!sentEmails) return [];
    const map = new Map<string, UserEmailGroup>();
    for (const email of sentEmails) {
      if (!map.has(email.user_id)) {
        map.set(email.user_id, { user_id: email.user_id, full_name: email.full_name, avatar_url: email.avatar_url, emails: [], lastSent: email.email_sent_at });
      }
      const g = map.get(email.user_id)!;
      g.emails.push(email);
      if (email.email_sent_at > g.lastSent) g.lastSent = email.email_sent_at;
    }
    return Array.from(map.values()).sort((a, b) => b.emails.length - a.emails.length);
  }, [sentEmails]);

  const groupedByType = useMemo((): TypeEmailGroup[] => {
    if (!sentEmails) return [];
    const map = new Map<string, TypeEmailGroup>();
    for (const email of sentEmails) {
      if (!map.has(email.type)) map.set(email.type, { type: email.type, count: 0, lastSent: email.email_sent_at });
      const g = map.get(email.type)!;
      g.count++;
      if (email.email_sent_at > g.lastSent) g.lastSent = email.email_sent_at;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [sentEmails]);

  const timelineData = useMemo((): DayEmailPoint[] => {
    if (!sentEmails) return [];
    const map: Record<string, number> = {};
    for (const email of sentEmails) {
      const day = email.email_sent_at.slice(0, 10);
      map[day] = (map[day] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }),
        count,
      }));
  }, [sentEmails]);

  const timelineChartConfig = useMemo(() => ({
    count: { label: "Emails sent", color: "var(--chart-1)" },
  }) satisfies ChartConfig, []);

  // ── User detail view ──
  if (selectedUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelectedUser(null)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <span className="text-muted-foreground">/</span>
          <Avatar className="h-5 w-5">
            {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
            <AvatarFallback className="text-xs">{(selectedUser.full_name ?? "?").charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{selectedUser.full_name ?? selectedUser.user_id}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <AdminMetricCard icon={MailIcon} label="Total emails" value={selectedUser.emails.length} loading={false} />
          <AdminMetricCard icon={ActivityIcon} label="Last sent" value={new Date(selectedUser.lastSent).toLocaleDateString()} loading={false} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Email History</CardTitle>
            <CardDescription>All emails sent to {selectedUser.full_name ?? selectedUser.user_id}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {selectedUser.emails.map((email, i) => (
                <motion.div key={email.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 px-6 py-3">
                  <Badge variant="secondary" className="text-xs font-mono shrink-0">{email.type}</Badge>
                  <div className="flex-1" />
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {new Date(email.email_sent_at).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Type detail view ──
  if (selectedType) {
    const typeEmails = sentEmails?.filter((e) => e.type === selectedType) ?? [];
    const typeCount = groupedByType.find((g) => g.type === selectedType)?.count ?? 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelectedType(null)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <span className="text-muted-foreground">/</span>
          <Badge variant="secondary" className="font-mono">{selectedType}</Badge>
        </div>
        <AdminMetricCard icon={MailIcon} label="Total sent" value={formatNumber(typeCount)} loading={false} />
        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>{typeCount} emails of type <span className="font-mono">{selectedType}</span></CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {typeEmails.map((email, i) => {
                const initials = (email.full_name ?? email.user_id).charAt(0).toUpperCase();
                return (
                  <motion.div key={email.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 px-6 py-3">
                    <Avatar className="h-7 w-7 shrink-0">
                      {email.avatar_url && <AvatarImage src={email.avatar_url} />}
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <p className="flex-1 text-sm font-medium truncate">{email.full_name ?? email.user_id}</p>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {new Date(email.email_sent_at).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main list view ──
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={containerVariants} initial="hidden" animate="visible" key={animationKey}>
        <motion.div variants={rowVariants} custom={0}>
          <AdminMetricCard icon={MailIcon} label={tAdmin("marketing.emailsSent")} value={formatNumber(emailStats?.totalSent ?? 0)} loading={statsLoading} />
        </motion.div>
        <motion.div variants={rowVariants} custom={1}>
          <AdminMetricCard icon={ActivityIcon} label={tAdmin("marketing.emailsSentRecently")} value={formatNumber(emailStats?.sentLast7Days ?? 0)} loading={statsLoading} />
        </motion.div>
        <motion.div variants={rowVariants} custom={2}>
          <AdminMetricCard icon={RepeatIcon} label={tAdmin("marketing.emailsPending")} value={formatNumber(emailStats?.pending ?? 0)} loading={statsLoading} />
        </motion.div>
      </motion.div>

      {/* View switcher */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">{tAdmin("marketing.recentEmailsTitle")}</h3>
        <div className="flex w-full rounded-xl border bg-muted/40 p-1 gap-1 sm:w-auto">
          {(["users", "types", "timeline"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              type="button"
              className={cn(
                "inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
                viewMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "users" ? <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" /> : mode === "types" ? <MailIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <ActivityIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {mode === "users" ? "By User" : mode === "types" ? "By Type" : "Timeline"}
            </button>
          ))}
        </div>
      </div>

      {/* By User */}
      {viewMode === "users" && (
        <Card>
          <CardContent className="p-0">
            {emailsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5"><div className="h-3 w-32 bg-muted rounded animate-pulse" /></div>
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !groupedByUser.length ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">{tAdmin("marketing.noEmailsSent")}</p>
            ) : (
              <div className="divide-y">
                {groupedByUser.map((group, i) => {
                  const initials = (group.full_name ?? group.user_id).charAt(0).toUpperCase();
                  return (
                    <motion.button
                      key={group.user_id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedUser(group)}
                      className="group flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {group.avatar_url && <AvatarImage src={group.avatar_url} />}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.full_name ?? group.user_id}</p>
                        <p className="text-xs text-muted-foreground">Last: {new Date(group.lastSent).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="tabular-nums">{group.emails.length}</Badge>
                        <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* By Type */}
      {viewMode === "types" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {emailsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                <div className="h-8 w-14 bg-muted rounded animate-pulse" />
              </Card>
            ))
          ) : !groupedByType.length ? (
            <Card className="col-span-3">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">{tAdmin("marketing.noEmailsSent")}</p>
              </CardContent>
            </Card>
          ) : (
            groupedByType.map((group, i) => (
              <motion.div key={group.type} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="group cursor-pointer rounded-lg transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelectedType(group.type)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedType(group.type);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="secondary" className="font-mono text-xs">{group.type}</Badge>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">{formatNumber(group.count)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last: {new Date(group.lastSent).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Timeline */}
      {viewMode === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle>Email Timeline</CardTitle>
            <CardDescription>Daily send volume (last 50 emails)</CardDescription>
          </CardHeader>
          <CardContent>
            {emailsLoading ? (
              <LoadingBeam className="py-8" />
            ) : !timelineData.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{tAdmin("marketing.noEmailsSent")}</p>
            ) : (
              <ChartContainer config={timelineChartConfig} className="h-[280px] w-full">
                <RechartsBarChart data={timelineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={30} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
