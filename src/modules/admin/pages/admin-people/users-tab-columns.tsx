import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { formatDate } from "@/lib/locale-utils";
import type { AdminUserRow } from "../../types";
import { formatSystemRole } from "./utils";
import { UsersRowActions, type UsersRowActionHandlers } from "./users-row-actions";

export const NEW_REG_DAYS = 7;

type CreateUsersTabColumnsParams = UsersRowActionHandlers & {
  tAdmin: (key: string, options?: Record<string, unknown>) => string;
  identityId: string | undefined;
};

export function createUsersTabColumns({
  tAdmin,
  identityId,
  onViewDetail,
  onViewJourney,
  onToggleJourneyTracking,
  onEdit,
  onMerge,
  onDelete,
}: CreateUsersTabColumnsParams): ColumnDef<AdminUserRow>[] {
  return [
    {
      id: "avatar", header: "", accessorKey: "avatar_url", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <UserAvatar
          user={{
            full_name: row.original.full_name,
            avatar_url: row.original.avatar_url,
          }}
          size="md"
        />
      ),
    },
    {
      id: "full_name", header: tAdmin("people.fullName"), accessorKey: "full_name", size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{row.original.full_name}</span>
          <UserGroupStack userId={row.original.id} size="xs" />
        </div>
      ),
    },
    {
      id: "email", header: tAdmin("common.email"), accessorKey: "email", size: 220,
      cell: ({ row }) => {
        const extra = (row.original.emails ?? []).filter((e) => !e.is_primary);
        return (
          <div className="space-y-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm" translate="no">{row.original.email}</p>
              <Badge variant="outline" className="h-4 shrink-0 px-1.5 py-0 text-[10px]">
                {tAdmin("people.primaryEmail")}
              </Badge>
            </div>
            {extra.length > 0 && (
              <p className="text-xs text-muted-foreground/70 truncate" translate="no">
                +{extra.length} {extra.length === 1 ? "more" : "more"}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "role", header: tAdmin("common.role"), accessorFn: (row) => row.role, size: 100,
      cell: ({ row }) => (
        <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
          {formatSystemRole(row.original.role, tAdmin("common.user"))}
        </Badge>
      ),
    },
    {
      id: "journey_tracking_ignored", header: tAdmin("people.journeyTracking"), accessorFn: (row) => row.journey_tracking_ignored, size: 120,
      cell: ({ row }) => (
        <Badge variant={row.original.journey_tracking_ignored ? "outline" : "secondary"}>
          {row.original.journey_tracking_ignored ? tAdmin("status.ignored") : tAdmin("status.tracked")}
        </Badge>
      ),
    },
    {
      id: "created_at", header: tAdmin("common.createdAt"), accessorKey: "created_at", size: 160,
      cell: ({ getValue }) => {
        const dateStr = getValue() as string;
        const daysSince = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        const isNew = daysSince <= NEW_REG_DAYS;
        return (
          <div className="flex items-center gap-1.5">
            <span>{formatDate(dateStr)}</span>
            {isNew && (
              <Badge
                variant="secondary"
                className={
                  daysSince <= 1
                    ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] text-[10px] leading-none px-1.5 py-0.5"
                    : "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] text-[10px] leading-none px-1.5 py-0.5"
                }
              >
                {daysSince === 0 ? tAdmin("common.today") : daysSince === 1 ? tAdmin("common.yesterday") : tAdmin("common.recent")}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <UsersRowActions
          user={row.original}
          isSelf={identityId === row.original.id}
          compact
          onViewDetail={onViewDetail}
          onViewJourney={onViewJourney}
          onToggleJourneyTracking={onToggleJourneyTracking}
          onEdit={onEdit}
          onMerge={onMerge}
          onDelete={onDelete}
        />
      ),
    },
  ];
}
