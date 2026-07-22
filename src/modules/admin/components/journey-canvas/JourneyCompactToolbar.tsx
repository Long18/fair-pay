import { Link } from "react-router";
import { ArrowLeftIcon, Trash2Icon } from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingOverview } from "../../types";

const EVENT_FILTER_OPTIONS = [
  { value: "all", labelKey: "journey.eventOptions.allEvents" },
  { value: "page_view", labelKey: "journey.eventOptions.pageView" },
  { value: "session_started", labelKey: "journey.eventOptions.sessionStarted" },
  { value: "nav_click", labelKey: "journey.eventOptions.navClick" },
  { value: "cta_click", labelKey: "journey.eventOptions.ctaClick" },
  { value: "form_step_view", labelKey: "journey.eventOptions.formStepView" },
  { value: "form_submit", labelKey: "journey.eventOptions.formSubmit" },
  { value: "form_success", labelKey: "journey.eventOptions.formSuccess" },
  { value: "form_error", labelKey: "journey.eventOptions.formError" },
  { value: "auth_login_success", labelKey: "journey.eventOptions.authLoginSuccess" },
  { value: "auth_signup_success", labelKey: "journey.eventOptions.authSignupSuccess" },
  { value: "expense_create_success", labelKey: "journey.eventOptions.expenseCreateSuccess" },
  { value: "settlement_completed", labelKey: "journey.eventOptions.settlementCompleted" },
  { value: "share_completed", labelKey: "journey.eventOptions.shareCompleted" },
  { value: "invite_sent", labelKey: "journey.eventOptions.inviteSent" },
  { value: "invite_accepted", labelKey: "journey.eventOptions.inviteAccepted" },
  { value: "dashboard_tab_changed", labelKey: "journey.eventOptions.dashboardTabChanged" },
  { value: "ai_chat_opened", labelKey: "journey.eventOptions.aiChatOpened" },
  { value: "billing_checkout_started", labelKey: "journey.eventOptions.billingCheckoutStarted" },
] as const;

interface JourneyCompactToolbarProps {
  userName: string;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  userIgnored?: boolean;
  dateFrom: string;
  dateTo: string;
  eventFilter: string;
  overview: UserTrackingOverview | undefined;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onEventFilterChange: (value: string) => void;
  onDeleteClick: () => void;
  onOverviewClick: () => void;
}

export function JourneyCompactToolbar({
  userName,
  userEmail,
  userAvatarUrl,
  userIgnored,
  dateFrom,
  dateTo,
  eventFilter,
  overview,
  onDateFromChange,
  onDateToChange,
  onEventFilterChange,
  onDeleteClick,
  onOverviewClick,
}: JourneyCompactToolbarProps) {
  const { tAdmin } = useAdminTranslation();
  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div
      className="flex flex-col gap-2 border-b border-border bg-background/95 px-1 py-2 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center"
      data-slot="journey-compact-toolbar"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 px-2">
          <Link to="/admin/people">
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="sr-only">{tAdmin("journey.backToPeople")}</span>
          </Link>
        </Button>
        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/15">
          <AvatarImage src={userAvatarUrl ?? undefined} alt={userName} />
          <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
          {userEmail ? (
            <p className="truncate text-xs text-muted-foreground" translate="no">
              {userEmail}
            </p>
          ) : (
            <p className="truncate text-xs text-muted-foreground">
              {tAdmin("journey.titleForUser", { name: userName })}
            </p>
          )}
        </div>
        {userIgnored ? (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {tAdmin("status.ignored")}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          {tAdmin("journey.totalSessions")}: {overview?.total_sessions ?? 0}
        </Badge>
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          {tAdmin("journey.totalEvents")}: {overview?.total_events ?? 0}
        </Badge>
        <Badge variant="outline" className="max-w-[120px] truncate text-[10px]">
          {overview?.top_sources?.[0]?.name ?? "direct"}
        </Badge>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onOverviewClick}>
          {tAdmin("journey.overview.open")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-8 w-[130px] text-xs"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-8 w-[130px] text-xs"
        />
        <Select value={eventFilter} onValueChange={onEventFilterChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder={tAdmin("journey.eventFilterPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {EVENT_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {tAdmin(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="destructive" size="sm" className="h-8" onClick={onDeleteClick}>
          <Trash2Icon className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">{tAdmin("journey.deleteData")}</span>
          <span className="sr-only sm:hidden">{tAdmin("journey.deleteData")}</span>
        </Button>
      </div>
    </div>
  );
}
