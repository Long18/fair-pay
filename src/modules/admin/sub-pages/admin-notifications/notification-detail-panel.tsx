import { Button } from "@/components/ui/button";
import { PencilIcon } from "@/components/ui/icons";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { formatDate } from "@/lib/locale-utils";
import { useAdminTranslation } from "../../i18n";
import { DetailRow } from "../../pages/admin-transactions/shared-ui";
import { ReadStatusBadge, TypeBadge } from "./badges";
import type { NotificationRow } from "./types";

export function NotificationDetailFooter({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <>
      <Button size="sm" variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={onDelete}>
        {tAdmin("common.delete")}
      </Button>
      <Button size="sm" variant="outline" onClick={onEdit}>
        <PencilIcon className="mr-2 h-4 w-4" />
        {tAdmin("common.edit")}
      </Button>
    </>
  );
}

export function NotificationDetailPanel({ notification }: { notification: NotificationRow }) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
        <UserAvatar user={{ full_name: notification.user_name, avatar_url: notification.user_avatar }} size="md" />
        <div className="min-w-0 flex-1">
          <span className="text-xs text-muted-foreground">{tAdmin("notifications.recipient")}</span>
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium">{notification.user_name}</p>
            <UserGroupStack userId={notification.user_id} size="xs" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <TypeBadge type={notification.type} />
        <ReadStatusBadge isRead={notification.is_read} />
      </div>

      <div className="space-y-1.5">
        <h4 className="text-xs text-muted-foreground">{tAdmin("common.message")}</h4>
        <p className="whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 text-sm">
          {notification.message || "—"}
        </p>
      </div>

      <div>
        <DetailRow label={tAdmin("common.createdAt")} value={formatDate(notification.created_at)} />
        <DetailRow label={tAdmin("layout.transactions.id")} value={<span className="font-mono text-xs">{notification.id}</span>} />
      </div>
    </div>
  );
}
