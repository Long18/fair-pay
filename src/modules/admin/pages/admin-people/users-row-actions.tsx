import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UsersIcon,
  MoreHorizontalIcon,
  ActivityIcon,
  PencilIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/ui/icons";
import type { AdminUserRow } from "../../types";
import { useAdminTranslation } from "../../i18n";

export type UsersRowActionHandlers = {
  onViewDetail: (user: AdminUserRow) => void;
  onViewJourney: (user: AdminUserRow) => void;
  onToggleJourneyTracking: (user: AdminUserRow) => void;
  onEdit: (user: AdminUserRow) => void;
  onMerge: (user: AdminUserRow) => void;
  onDelete: (user: AdminUserRow) => void;
};

type UsersRowActionsProps = UsersRowActionHandlers & {
  user: AdminUserRow;
  isSelf: boolean;
  compact?: boolean;
};

export function UsersRowActions({
  user,
  isSelf,
  compact = false,
  onViewDetail,
  onViewJourney,
  onToggleJourneyTracking,
  onEdit,
  onMerge,
  onDelete,
}: UsersRowActionsProps) {
  const { tAdmin } = useAdminTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={compact ? "h-8 w-8" : "h-9 w-9 cursor-pointer"}
        >
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetail(user)}>
          {compact ? (
            <>
              <EyeIcon className="mr-2 h-4 w-4" />
              {tAdmin("common.details")}
            </>
          ) : (
            tAdmin("common.details")
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onViewJourney(user)}>
          <ActivityIcon className="mr-2 h-4 w-4" />
          {tAdmin("people.viewJourney")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleJourneyTracking(user)}>
          {compact ? (
            user.journey_tracking_ignored ? (
              <>
                <EyeIcon className="mr-2 h-4 w-4" />
                {tAdmin("people.resumeTracking")}
              </>
            ) : (
              <>
                <EyeOffIcon className="mr-2 h-4 w-4" />
                {tAdmin("people.ignoreTracking")}
              </>
            )
          ) : (
            user.journey_tracking_ignored
              ? tAdmin("people.resumeTracking")
              : tAdmin("people.ignoreTracking")
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <PencilIcon className="mr-2 h-4 w-4" />
          {tAdmin("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMerge(user)} disabled={isSelf}>
          <UsersIcon className="mr-2 h-4 w-4" />
          {isSelf ? tAdmin("people.cannotMergeSelf") : tAdmin("people.mergeProfile")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(user)}
          disabled={isSelf}
          className="text-destructive"
        >
          {compact ? (
            <>
              <Trash2Icon className="mr-2 h-4 w-4" />
              {isSelf ? tAdmin("people.cannotDeleteSelf") : tAdmin("people.deleteUser")}
            </>
          ) : (
            isSelf ? tAdmin("people.cannotDeleteSelf") : tAdmin("people.deleteUser")
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
