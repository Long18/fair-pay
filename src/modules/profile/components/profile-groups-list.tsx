import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/locale-utils";
import { getInitials } from "@/components/user-display";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useGo } from "@refinedev/core";
import { EmptyGroups } from "./profile-empty-states";
import { useHaptics } from "@/hooks/use-haptics";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";

const PROFILE_GROUPS_TAB_PREVIEW = 5;

interface Group {
  id: string;
  name: string;
  created_at: string;
  avatar_url?: string;
}

interface ProfileGroupsListProps {
  groups: Group[];
  isLoading?: boolean;
  className?: string;
}

export const ProfileGroupsList = ({
  groups,
  isLoading,
  className,
}: ProfileGroupsListProps) => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  if (isLoading) {
    return (
      <ul className={cn("divide-y divide-border/60 rounded-lg border border-border/60", className)}>
        {[...Array(4)].map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (groups.length === 0) {
    return <EmptyGroups className={className} />;
  }

  const previewGroups = groups.slice(0, PROFILE_GROUPS_TAB_PREVIEW);
  const hasMore = groups.length > PROFILE_GROUPS_TAB_PREVIEW;

  const openGroup = (groupId: string) => {
    tap();
    go({ to: `/groups/show/${groupId}` });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
        {previewGroups.map((group) => (
          <li key={group.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              onClick={() => openGroup(group.id)}
              onKeyDown={onButtonKeyDown(() => openGroup(group.id))}
            >
              <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                <AvatarImage src={group.avatar_url || undefined} alt="" className="rounded-lg" />
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(group.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{group.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("profile.groupCreatedOn", {
                    date: formatDateShort(group.created_at),
                    defaultValue: `Created ${formatDateShort(group.created_at)}`,
                  })}
                </p>
              </div>
              <ChevronRightIcon size={16} className="shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-full text-muted-foreground"
          onClick={() => {
            tap();
            go({ to: "/connections?tab=groups" });
          }}
        >
          {t("profile.viewAllGroups", "View all groups")}
          <span className="ml-1 tabular-nums text-foreground">({groups.length})</span>
          <ChevronRightIcon size={14} className="ml-auto" />
        </Button>
      ) : null}
    </div>
  );
};
