import { useState } from "react";
import { Link } from "react-router";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminTranslation } from "../../i18n";
import { formatRelativeTime, useLatestTrackedUsers } from "./hooks";
import { OVERVIEW_PANEL_HEIGHT } from "./trends-card";

const ACTIVITY_PAGE_SIZE = 8;

export function OverviewRecentActivityCard({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const [page, setPage] = useState(0);
  const { data: allLatestUsers, isLoading } = useLatestTrackedUsers(enabled);

  const all = allLatestUsers ?? [];
  const pageCount = Math.max(1, Math.ceil(all.length / ACTIVITY_PAGE_SIZE));
  const users = all.slice(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE);
  const hasMore = all.length > (page + 1) * ACTIVITY_PAGE_SIZE;

  return (
    <Card className="gap-3 py-4 lg:col-span-4">
      <CardHeader className="flex items-center justify-between gap-2 px-4 pb-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-sm">{tAdmin("overview.recentActivity")}</CardTitle>
          <CardDescription className="truncate text-xs">
            {tAdmin("overview.latestTrackedUsersDescription")}
          </CardDescription>
        </div>
        <Link
          to="/admin/people"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {tAdmin("overview.viewAllUsers")} <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </CardHeader>

      <CardContent className="flex-1 px-0">
        <ScrollArea className={OVERVIEW_PANEL_HEIGHT}>
          {isLoading ? (
            <div className="space-y-1 px-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-muted animate-pulse" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-2.5 w-28 rounded bg-muted animate-pulse" />
                    <div className="h-2.5 w-40 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : !users.length ? (
            <p className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {tAdmin("overview.noTrackingData")}
            </p>
          ) : (
            <AnimatedList items={users} className="relative px-4">
              {users.map((user, index) => {
                const initials = (user.full_name ?? user.email).charAt(0).toUpperCase();
                const isLast = index === users.length - 1;
                return (
                  <AnimatedRow key={user.user_id} index={index}>
                    <Link
                      to={`/admin/people/${user.user_id}/journey`}
                      className="group relative flex items-center gap-2.5 rounded-md py-1.5 transition-colors"
                    >
                      <div className="relative flex w-7 shrink-0 flex-col items-center self-stretch">
                        <Avatar className="z-10 h-7 w-7">
                          {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name ?? user.email} />}
                          <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                        </Avatar>
                        {!isLast && (
                          <div className="absolute top-8 -bottom-1.5 left-1/2 w-px -translate-x-1/2 bg-border/60" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[13px] font-medium leading-tight transition-colors group-hover:text-primary">
                            {user.full_name ?? user.email}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(user.last_seen_at, tAdmin)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground/80">
                            {user.last_page ?? user.email}
                          </p>
                          {user.device_type && (
                            <Badge variant="secondary" className="hidden h-4 px-1 text-[10px] sm:inline-flex">
                              {user.device_type}
                            </Badge>
                          )}
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            {tAdmin("overview.sessions", { count: user.session_count })}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  </AnimatedRow>
                );
              })}
            </AnimatedList>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="justify-between gap-2 border-t px-4 [.border-t]:pt-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {tAdmin("common.pageCount", { page: page + 1, total: pageCount })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 0 || isLoading}
            onClick={() => setPage((p) => p - 1)}
            className="h-6 w-6"
            aria-label={tAdmin("common.previous")}
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!hasMore || isLoading}
            onClick={() => setPage((p) => p + 1)}
            className="h-6 w-6"
            aria-label={tAdmin("common.next")}
          >
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
