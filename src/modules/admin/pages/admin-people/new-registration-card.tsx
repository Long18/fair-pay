import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/locale-utils";
import type { AdminUserRow } from "../../types";
import { useAdminTranslation } from "../../i18n";
import { ADMIN_PEOPLE_RENDER_TIME } from "./utils";

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

  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onViewDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onViewDetail(); }}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
        <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.full_name}</p>
        <p className="text-xs text-muted-foreground truncate" translate="no">{user.email}</p>
        {(user.emails ?? []).filter((e) => !e.is_primary).length > 0 && (
          <p className="text-xs text-muted-foreground/60 truncate">
            +{(user.emails ?? []).filter((e) => !e.is_primary).length} more
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{formatDate(user.created_at)}</p>
        <Badge
          variant="secondary"
          className={
            daysSinceRegistration <= 1
              ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] text-xs mt-1"
              : daysSinceRegistration <= 7
                ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] text-xs mt-1"
                : "text-xs mt-1"
          }
        >
          {daysSinceRegistration === 0
            ? tAdmin("common.today")
            : daysSinceRegistration === 1
              ? tAdmin("common.yesterday")
              : tAdmin("overview.relative.daysAgo", { count: daysSinceRegistration })}
        </Badge>
      </div>
    </div>
  );
}
