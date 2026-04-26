import * as React from "react";
import { Users as UsersIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useUserGroups, type GroupAffiliation } from "@/hooks/use-user-groups";
import { cn } from "@/lib/utils";

import { getInitials } from "./user-avatar";
import { UserGroupsDetail } from "./user-groups-detail";

export type UserGroupStackSize = "xs" | "sm" | "md";
export type UserGroupStackVariant = "inline" | "collapsed";

interface UserGroupStackProps {
  userId: string;
  variant?: UserGroupStackVariant;
  maxAvatars?: number;
  size?: UserGroupStackSize;
  excludeGroupIds?: string[];
  className?: string;
}

const avatarSizeClass: Record<UserGroupStackSize, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-7 w-7",
};

const overflowTextSizeClass: Record<UserGroupStackSize, string> = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-[11px]",
};

export function UserGroupStack({
  userId,
  variant = "inline",
  maxAvatars = 3,
  size = "sm",
  excludeGroupIds,
  className,
}: UserGroupStackProps) {
  const { data, isLoading, isError } = useUserGroups(userId);
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const groups: GroupAffiliation[] = React.useMemo(() => {
    if (!data) return [];
    if (!excludeGroupIds || excludeGroupIds.length === 0) return data;
    const exclude = new Set(excludeGroupIds);
    return data.filter((g) => !exclude.has(g.id));
  }, [data, excludeGroupIds]);

  if (isError) return null;

  if (isLoading) {
    return (
      <div
        className={cn("flex items-center -space-x-1.5", className)}
        aria-hidden
        data-testid="user-group-stack-loading"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              avatarSizeClass[size],
              "rounded-full bg-muted/50 border border-background"
            )}
          />
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  const trigger =
    variant === "collapsed" ? (
      <CollapsedTrigger count={groups.length} />
    ) : (
      <InlineStack
        groups={groups}
        maxAvatars={maxAvatars}
        size={size}
        overflowTextClass={overflowTextSizeClass[size]}
        avatarClass={avatarSizeClass[size]}
        className={className}
      />
    );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSheetOpen(true);
          }}
          className="inline-flex items-center"
          aria-label={`Show ${groups.length} group${groups.length === 1 ? "" : "s"}`}
        >
          {trigger}
        </button>
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Groups"
          description={`${groups.length} group${groups.length === 1 ? "" : "s"}`}
        >
          <UserGroupsDetail groups={groups} />
        </BottomSheet>
      </>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center"
          aria-label={`Show ${groups.length} group${groups.length === 1 ? "" : "s"}`}
        >
          {trigger}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-2" align="start">
        <UserGroupsDetail groups={groups} />
      </HoverCardContent>
    </HoverCard>
  );
}

function CollapsedTrigger({ count }: { count: number }) {
  return (
    <Badge
      variant="secondary"
      className="text-[10px] px-1.5 py-0 h-5 gap-1"
      data-testid="user-group-stack-collapsed"
    >
      <UsersIcon className="h-2.5 w-2.5" />
      Groups +{count}
    </Badge>
  );
}

interface InlineStackProps {
  groups: GroupAffiliation[];
  maxAvatars: number;
  size: UserGroupStackSize;
  avatarClass: string;
  overflowTextClass: string;
  className?: string;
}

function InlineStack({
  groups,
  maxAvatars,
  avatarClass,
  overflowTextClass,
  className,
}: InlineStackProps) {
  const visible = groups.slice(0, maxAvatars);
  const overflow = groups.length - visible.length;

  return (
    <div
      className={cn("flex items-center -space-x-1.5", className)}
      data-testid="user-group-stack-inline"
    >
      {visible.map((group) => (
        <Avatar
          key={group.id}
          className={cn(
            avatarClass,
            "border border-background ring-0 shrink-0"
          )}
        >
          {group.avatar_url ? (
            <AvatarImage src={group.avatar_url} alt={group.name} />
          ) : null}
          <AvatarFallback
            className={cn(
              "bg-primary/10 text-primary font-medium",
              overflowTextClass
            )}
          >
            {getInitials(group.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            avatarClass,
            "rounded-full bg-muted border border-background flex items-center justify-center font-medium",
            overflowTextClass
          )}
          data-testid="user-group-stack-overflow"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
