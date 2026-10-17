import { useMemo, useState } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  UsersIcon,
  ActivityIcon,
  ChevronRightIcon,
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
import { PanelCard, PanelEmpty } from "./panel-card";
import { EmailDrilldownSheet } from "./emails-detail";

type EmailViewMode = "users" | "types" | "timeline";

const VIEW_MODES: { value: EmailViewMode; labelKey: string; icon: typeof UsersIcon }[] = [
  { value: "users", labelKey: "layout.insights.marketing.byUser", icon: UsersIcon },
  { value: "types", labelKey: "layout.insights.marketing.byType", icon: MailIcon },
  { value: "timeline", labelKey: "layout.insights.marketing.timeline", icon: ActivityIcon },
];

const LIST_HEIGHT = "h-[340px]";

function ListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-4 py-2">
          <div className="h-7 w-7 shrink-0 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-32 flex-1 rounded bg-muted animate-pulse" />
          <div className="h-5 w-10 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function UsersView({
  groups,
  selectedId,
  onSelect,
}: {
  groups: UserEmailGroup[];
  selectedId: string | null;
  onSelect: (group: UserEmailGroup) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  return (
    <ScrollArea className={LIST_HEIGHT}>
      <div className="divide-y">
        {groups.map((group, i) => {
          const initials = (group.full_name ?? group.user_id).charAt(0).toUpperCase();
          const selected = selectedId === group.user_id;
          return (
            <motion.button
              key={group.user_id}
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.03 }}
              onClick={() => onSelect(group)}
              aria-pressed={selected}
              className={cn(
                "group flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                selected && "bg-primary/5 hover:bg-primary/10",
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                {group.avatar_url && <AvatarImage src={group.avatar_url} />}
                <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{group.full_name ?? group.user_id}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tAdmin("layout.insights.marketing.lastSent", {
                    date: new Date(group.lastSent).toLocaleDateString(),
                  })}
                </p>
              </div>
              <Badge variant="secondary" className="tabular-nums">{group.emails.length}</Badge>
              <ChevronRightIcon
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-opacity",
                  selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
                aria-hidden
              />
            </motion.button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function TypesView({
  groups,
  selectedType,
  onSelect,
}: {
  groups: TypeEmailGroup[];
  selectedType: string | null;
  onSelect: (type: string) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  return (
    <ScrollArea className={LIST_HEIGHT}>
      <div className="grid gap-2 px-4 py-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((group, i) => (
          <motion.button
            key={group.type}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.04 }}
            onClick={() => onSelect(group.type)}
            aria-pressed={selectedType === group.type}
            className={cn(
              "group flex cursor-pointer flex-col gap-1 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedType === group.type && "border-primary/60 bg-primary/5",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="truncate font-mono text-xs">{group.type}</Badge>
              <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </div>
            <p className="text-xl font-semibold tabular-nums leading-tight">{formatNumber(group.count)}</p>
            <p className="text-[11px] text-muted-foreground">
              {tAdmin("layout.insights.marketing.lastSent", {
                date: new Date(group.lastSent).toLocaleDateString(),
              })}
            </p>
          </motion.button>
        ))}
      </div>
    </ScrollArea>
  );
}

function TimelineView({ data }: { data: DayEmailPoint[] }) {
  const { tAdmin } = useAdminTranslation();
  const config = useMemo(
    () =>
      ({
        count: { label: tAdmin("layout.insights.marketing.emailsSentLabel"), color: "var(--chart-1)" },
      }) satisfies ChartConfig,
    [tAdmin],
  );
  return (
    <div className={cn(LIST_HEIGHT, "flex flex-col gap-1 px-4")}>
      <p className="text-[11px] text-muted-foreground">
        {tAdmin("layout.insights.marketing.timelineDescription")}
      </p>
      <ChartContainer config={config} className="aspect-auto min-h-0 w-full flex-1">
        <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tickMargin={4} width={30} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ChartContainer>
    </div>
  );
}

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

  const isEmpty =
    viewMode === "users" ? !groupedByUser.length : viewMode === "types" ? !groupedByType.length : !timelineData.length;

  return (
    <div className="space-y-3">
      <motion.div className="grid grid-cols-1 gap-3 sm:grid-cols-3" variants={containerVariants} initial="hidden" animate="visible" key={animationKey}>
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

      <PanelCard
        title={tAdmin("marketing.recentEmailsTitle")}
        contentClassName="px-0"
        action={
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as EmailViewMode)}
            aria-label={tAdmin("layout.insights.marketing.viewMode")}
          >
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <ToggleGroupItem key={mode.value} value={mode.value} className="h-7 gap-1.5 px-2 text-xs" aria-label={tAdmin(mode.labelKey)}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">{tAdmin(mode.labelKey)}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        }
      >
        {emailsLoading ? (
          viewMode === "timeline" ? (
            <LoadingBeam className={LIST_HEIGHT} />
          ) : (
            <ListSkeleton />
          )
        ) : isEmpty ? (
          <PanelEmpty>{tAdmin("marketing.noEmailsSent")}</PanelEmpty>
        ) : viewMode === "users" ? (
          <UsersView
            groups={groupedByUser}
            selectedId={selectedUser?.user_id ?? null}
            onSelect={(group) => {
              setSelectedType(null);
              setSelectedUser(group);
            }}
          />
        ) : viewMode === "types" ? (
          <TypesView
            groups={groupedByType}
            selectedType={selectedType}
            onSelect={(type) => {
              setSelectedUser(null);
              setSelectedType(type);
            }}
          />
        ) : (
          <TimelineView data={timelineData} />
        )}
      </PanelCard>

      <EmailDrilldownSheet
        selectedUser={selectedUser}
        selectedType={selectedType}
        sentEmails={sentEmails}
        typeCount={groupedByType.find((g) => g.type === selectedType)?.count ?? 0}
        onClose={() => {
          setSelectedUser(null);
          setSelectedType(null);
        }}
      />
    </div>
  );
}
