import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-display";
import { formatDate } from "@/lib/locale-utils";
import type { AdminUserRow } from "../../types";
import {
  AdminMobileCard,
  AdminMobileCards,
} from "../../components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import { formatSystemRole } from "./utils";
import { UsersRowActions, type UsersRowActionHandlers } from "./users-row-actions";

type UsersMobileListProps = UsersRowActionHandlers & {
  users: AdminUserRow[];
  identityId: string | undefined;
  onCardClick: (user: AdminUserRow) => void;
};

export function UsersMobileList({
  users,
  identityId,
  onCardClick,
  onViewDetail,
  onViewJourney,
  onToggleJourneyTracking,
  onEdit,
  onMerge,
  onDelete,
}: UsersMobileListProps) {
  const { tAdmin } = useAdminTranslation();

  return (
    <AdminMobileCards
      items={users}
      getKey={(user) => user.id}
      renderItem={(user) => (
        <AdminMobileCard
          title={user.full_name}
          description={user.email}
          leading={
            <UserAvatar
              user={{ full_name: user.full_name, avatar_url: user.avatar_url }}
              size="md"
            />
          }
          badges={
            <>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {formatSystemRole(user.role, tAdmin("common.user"))}
              </Badge>
              <Badge variant={user.journey_tracking_ignored ? "outline" : "secondary"}>
                {user.journey_tracking_ignored ? tAdmin("status.ignored") : tAdmin("status.tracked")}
              </Badge>
            </>
          }
          meta={[
            { label: tAdmin("common.createdAt"), value: formatDate(user.created_at) },
            { label: "ID", value: <span className="font-mono text-xs">{user.id.slice(0, 8)}</span> },
          ]}
          actions={
            <UsersRowActions
              user={user}
              isSelf={identityId === user.id}
              onViewDetail={onViewDetail}
              onViewJourney={onViewJourney}
              onToggleJourneyTracking={onToggleJourneyTracking}
              onEdit={onEdit}
              onMerge={onMerge}
              onDelete={onDelete}
            />
          }
          onClick={() => onCardClick(user)}
          ariaLabel={user.full_name}
        />
      )}
    />
  );
}
