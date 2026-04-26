import * as React from "react";
import { Link } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { GroupAffiliation } from "@/hooks/use-user-groups";
import { getInitials } from "./user-avatar";

interface UserGroupsDetailProps {
  groups: GroupAffiliation[];
  isLoading?: boolean;
  className?: string;
}

export function UserGroupsDetail({
  groups,
  isLoading,
  className,
}: UserGroupsDetailProps) {
  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p
        className={cn("text-xs text-muted-foreground py-1", className)}
        data-testid="user-groups-detail-empty"
      >
        No groups yet
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {groups.map((group) => (
        <li key={group.id}>
          <Link
            to={`/groups/show/${group.id}`}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent transition-colors"
          >
            <Avatar className="h-7 w-7 shrink-0">
              {group.avatar_url ? (
                <AvatarImage src={group.avatar_url} alt={group.name} />
              ) : null}
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm truncate">{group.name}</span>
            {group.role === "admin" && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                Admin
              </Badge>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
