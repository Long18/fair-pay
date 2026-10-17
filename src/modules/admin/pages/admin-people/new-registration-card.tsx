import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserPlusIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import type { AdminUserRow } from "../../types";
import { useAdminTranslation } from "../../i18n";
import { ADMIN_PEOPLE_RENDER_TIME } from "./utils";
import { NEW_REG_DAYS } from "./users-tab-columns";

export function NewRegistrationCard({
  user,
  onViewDetail,
}: {
  user: AdminUserRow;
  onViewDetail: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const daysSinceRegistration = Math.floor(
    (ADMIN_PEOPLE_RENDER_TIME - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  const extraEmailCount = (user.emails ?? []).filter((e) => !e.is_primary).length;

  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
      onClick={onViewDetail}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
        <AvatarFallback className="text-xs">{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.full_name}</p>
        <p className="truncate text-xs text-muted-foreground" translate="no">
          {user.email}
          {extraEmailCount > 0 ? (
            <span className="ml-1 text-muted-foreground/60">
              {tAdmin("layout.people.moreEmails", { count: extraEmailCount })}
            </span>
          ) : null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Badge
          variant="secondary"
          className={cn(
            "px-1.5 py-0 text-[10px]",
            daysSinceRegistration <= 1
              ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]"
              : daysSinceRegistration <= 7 && "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)]"
          )}
        >
          {daysSinceRegistration === 0
            ? tAdmin("common.today")
            : daysSinceRegistration === 1
              ? tAdmin("common.yesterday")
              : tAdmin("overview.relative.daysAgo", { count: daysSinceRegistration })}
        </Badge>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(user.created_at)}</p>
      </div>
    </button>
  );
}

/** Toolbar button that lists recent sign-ups in a popover instead of a block above the table. */
export function NewRegistrationsPopover({
  users,
  onSelect,
}: {
  users: AdminUserRow[];
  onSelect: (user: AdminUserRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);

  if (users.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 sm:h-9"
          aria-label={tAdmin("layout.people.newRegistrationsAria", { count: users.length, days: NEW_REG_DAYS })}
        >
          <UserPlusIcon className="h-4 w-4 text-[var(--status-success-foreground)]" />
          <span>{tAdmin("layout.people.newRegistrationsChip")}</span>
          <Badge
            variant="secondary"
            className="h-5 bg-[var(--status-success-bg)] px-1.5 text-xs tabular-nums text-[var(--status-success-foreground)]"
          >
            {users.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">{tAdmin("people.newRegistrationsTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {tAdmin("people.newRegistrationsDescription", { days: NEW_REG_DAYS })}
          </p>
        </div>
        <div className="max-h-80 space-y-0.5 overflow-y-auto p-1.5">
          {users.map((user) => (
            <NewRegistrationCard
              key={user.id}
              user={user}
              onViewDetail={() => {
                setOpen(false);
                onSelect(user);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
