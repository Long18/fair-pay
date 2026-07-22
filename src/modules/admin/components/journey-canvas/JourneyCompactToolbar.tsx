import { Link } from "react-router";
import { MoreHorizontalIcon, SlidersHorizontalIcon } from "lucide-react";
import { ArrowLeftIcon, Trash2Icon } from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingSessionRow } from "../../types";

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

function formatSessionLabel(session: UserTrackingSessionRow, locale: string) {
  const when = new Date(session.started_at).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${session.landing_path} · ${when}`;
}

interface JourneyCompactToolbarProps {
  userName: string;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  userIgnored?: boolean;
  dateFrom: string;
  dateTo: string;
  eventFilter: string;
  sessions: UserTrackingSessionRow[] | undefined;
  sessionsTotal: number;
  selectedSessionId: string;
  sessionsLoading?: boolean;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onEventFilterChange: (value: string) => void;
  onSelectSession: (sessionId: string) => void;
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
  sessions,
  sessionsTotal,
  selectedSessionId,
  sessionsLoading,
  onDateFromChange,
  onDateToChange,
  onEventFilterChange,
  onSelectSession,
  onDeleteClick,
  onOverviewClick,
}: JourneyCompactToolbarProps) {
  const { tAdmin, locale } = useAdminTranslation();
  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const filtersActive = eventFilter !== "all";

  return (
    <div
      className="flex items-center gap-2 border-b border-border bg-background px-2 py-2 sm:px-3"
      data-slot="journey-compact-toolbar"
    >
      <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
        <Link to="/admin/people">
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="sr-only">{tAdmin("journey.backToPeople")}</span>
        </Link>
      </Button>

      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={userAvatarUrl ?? undefined} alt={userName} />
        <AvatarFallback className="text-[10px] font-semibold">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
          {userIgnored ? (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {tAdmin("status.ignored")}
            </Badge>
          ) : null}
        </div>
        {userEmail ? (
          <p className="truncate text-[11px] text-muted-foreground" translate="no">
            {userEmail}
          </p>
        ) : null}
      </div>

      <Select
        value={selectedSessionId}
        onValueChange={onSelectSession}
        disabled={sessionsLoading}
      >
        <SelectTrigger className="h-8 w-[min(11rem,34vw)] text-xs sm:w-44">
          <SelectValue placeholder={tAdmin("journey.sessionPlaceholder")} />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">
            {tAdmin("journey.allSessions", { count: sessionsTotal })}
          </SelectItem>
          {(sessions ?? []).map((session) => (
            <SelectItem key={session.id} value={session.id}>
              {formatSessionLabel(session, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2.5"
          >
            <SlidersHorizontalIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tAdmin("journey.filters")}</span>
            {filtersActive ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{tAdmin("journey.dateRange")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tAdmin("journey.eventFilterPlaceholder")}</Label>
            <Select value={eventFilter} onValueChange={onEventFilterChange}>
              <SelectTrigger className="h-8 w-full text-xs">
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
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">{tAdmin("journey.moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOverviewClick}>
            {tAdmin("journey.overview.open")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDeleteClick}
          >
            <Trash2Icon className="mr-2 h-3.5 w-3.5" />
            {tAdmin("journey.deleteData")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
