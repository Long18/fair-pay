import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/locale-utils";
import { dateUtils } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  PlusIcon,
  EyeIcon,
  UsersIcon,
  ArchiveIcon,
  LogInIcon,
  Clock3Icon,
  Loader2Icon,
} from "@/components/ui/icons";

export interface BalanceSummary {
  you_owe: number;
  owed_to_you: number;
  net_balance: number;
}

export interface GroupMemberPreview {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description?: string | null;
    avatar_url?: string | null;
    created_at: string;
    member_count: number;
    members: GroupMemberPreview[];
    is_archived?: boolean;
  };
  balanceSummary?: BalanceSummary;
  isLoading?: boolean;
  canManage?: boolean;
  isMember?: boolean;
  joinRequestStatus?: "pending" | "approved" | "rejected" | null;
  onRequestJoin?: (groupId: string) => void;
  isRequestingJoin?: boolean;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

type StatusKind = "archived" | "settled" | "notJoined" | null;

function getStatusKind(
  isArchived: boolean,
  isMember: boolean,
  isLoading: boolean | undefined,
  isSettled: boolean
): StatusKind {
  if (isArchived) return "archived";
  if (!isMember) return "notJoined";
  if (isMember && !isLoading && isSettled) return "settled";
  return null;
}

export function GroupCard({
  group,
  balanceSummary,
  isLoading,
  canManage,
  isMember = true,
  joinRequestStatus,
  onRequestJoin,
  isRequestingJoin,
}: GroupCardProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  const youOwe = balanceSummary?.you_owe ?? 0;
  const owedToYou = balanceSummary?.owed_to_you ?? 0;
  const isSettled = youOwe === 0 && owedToYou === 0;
  const isArchived = group.is_archived ?? false;
  const statusKind = getStatusKind(isArchived, isMember, isLoading, isSettled);

  const handleCardClick = () => {
    if (!isMember) return;
    tap();
    go({ to: `/groups/show/${group.id}` });
  };

  const statusBadge =
    statusKind === "archived" ? (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
      >
        {t("groups.status.archived", "Archived")}
      </Badge>
    ) : statusKind === "settled" ? (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {t("groups.status.settled", "Settled")}
      </Badge>
    ) : statusKind === "notJoined" ? (
      <Badge
        variant="secondary"
        title={t(
          "groups.status.notJoinedFull",
          "You are not a member of this group"
        )}
      >
        {t("groups.status.notJoined", "Not a member")}
      </Badge>
    ) : null;

  const titleNode = (
    <h3
      className="truncate text-sm font-semibold leading-snug sm:text-base"
      translate="no"
    >
      {group.name}
    </h3>
  );

  return (
    <Card
      interactive={isMember}
      className={cn("gap-4 py-4", isMember ? "cursor-pointer" : undefined)}
      onClick={handleCardClick}
    >
      <CardHeader className="grid-cols-1 gap-3 px-4 pb-0 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar
            className={cn(
              "size-11 shrink-0 sm:size-12",
              isArchived && "opacity-75"
            )}
          >
            <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {isArchived ? (
                <ArchiveIcon className="size-5 text-amber-600" />
              ) : (
                getInitials(group.name)
              )}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
            {/* Title + badge as siblings — badge never shares the truncate line */}
            <div className="flex min-w-0 items-start gap-2">
              <CardTitle className="min-w-0 flex-1 overflow-hidden">
                {group.name.length > 18 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="min-w-0 overflow-hidden">{titleNode}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-balance">
                      {group.name}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  titleNode
                )}
              </CardTitle>
              {statusBadge ? (
                <div className="shrink-0 pt-0.5">{statusBadge}</div>
              ) : null}
            </div>

            {group.description ? (
              group.description.length > 48 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                      {group.description}
                    </CardDescription>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm text-balance">
                    {group.description}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                  {group.description}
                </CardDescription>
              )
            ) : null}

            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground sm:text-xs">
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="size-3 shrink-0" />
                {t("groups.membersCount", "{{count}} members", {
                  count: group.member_count,
                })}
              </span>
              <span aria-hidden="true">·</span>
              <span>{dateUtils.formatRelative(group.created_at)}</span>
            </div>
          </div>
        </div>

        {isMember && group.members.length > 0 ? (
          <div className="flex items-center">
            {group.members.slice(0, 5).map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <Avatar className="-ml-1.5 size-7 border-2 border-background first:ml-0">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="bottom">{member.name}</TooltipContent>
              </Tooltip>
            ))}
            {group.member_count > 5 ? (
              <div className="-ml-1.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                <span className="text-[10px] font-medium">
                  +{group.member_count - 5}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 px-4 pt-0 sm:px-5">
        {isMember && !isLoading && !isSettled ? (
          <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
            {youOwe > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs font-medium text-destructive">
                  {t("dashboard.youOwe", "You owe")}
                </span>
                <span className="truncate text-sm font-semibold tabular-nums text-destructive">
                  {formatNumber(youOwe)} ₫
                </span>
              </div>
            ) : null}
            {owedToYou > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {t("dashboard.youAreOwed", "You are owed")}
                </span>
                <span className="truncate text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatNumber(owedToYou)} ₫
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {isMember && isLoading ? (
          <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : null}
      </CardContent>

      <CardFooter
        className="gap-2 px-4 pt-0 sm:px-5"
        onClick={(event) => event.stopPropagation()}
      >
        {isMember ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="min-w-0 flex-1"
              onClick={() => {
                tap();
                go({ to: `/groups/show/${group.id}` });
              }}
            >
              <EyeIcon className="size-4" />
              <span className="truncate">{t("common.view", "View")}</span>
            </Button>
            {(!isArchived || canManage) && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  tap();
                  go({ to: `/groups/${group.id}/expenses/create` });
                }}
                title={t("expenses.addExpense", "Add Expense")}
                aria-label={t("expenses.addExpense", "Add Expense")}
              >
                <PlusIcon className="size-4" />
              </Button>
            )}
          </>
        ) : joinRequestStatus === "pending" ? (
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 border-amber-300 text-amber-700 dark:text-amber-300"
            disabled
          >
            <Clock3Icon className="size-4 shrink-0" />
            <span className="truncate">
              {t("groups.joinPrompt.pendingShort", "Pending")}
            </span>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="min-w-0 flex-1"
            onClick={() => {
              tap();
              onRequestJoin?.(group.id);
            }}
            disabled={isRequestingJoin}
          >
            {isRequestingJoin ? (
              <Loader2Icon className="size-4 shrink-0 animate-spin" />
            ) : (
              <LogInIcon className="size-4 shrink-0" />
            )}
            <span className="truncate">
              {joinRequestStatus === "rejected"
                ? t("groups.joinPrompt.requestAgain", "Request again")
                : t("groups.joinPrompt.requestJoin", "Request to join")}
            </span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
