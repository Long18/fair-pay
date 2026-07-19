import { Badge } from "@/components/ui/badge";
import { useAdminTranslation } from "../../i18n";

export function TypeBadge({ type }: { type: string }) {
  const { tAdmin } = useAdminTranslation();

  return (
    <Badge className="bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]">
      {tAdmin(`notifications.types.${type}`)}
    </Badge>
  );
}

export function ReadStatusBadge({ isRead }: { isRead: boolean }) {
  const { tAdmin } = useAdminTranslation();

  return isRead ? (
    <Badge className="bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]">
      {tAdmin("status.read")}
    </Badge>
  ) : (
    <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-border)]">
      {tAdmin("status.unread")}
    </Badge>
  );
}
