import * as React from "react";

import { cn } from "@/lib/utils";

import { UserAvatar, type UserAvatarSize } from "./user-avatar";
import {
  UserGroupStack,
  type UserGroupStackSize,
} from "./user-group-stack";

export type UserDisplaySize = UserAvatarSize;
export type UserDisplayLayout = "inline" | "row" | "card";
export type UserDisplayGroupStack = "auto" | "collapsed" | "hidden";

interface UserDisplayUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
}

interface UserDisplayProps {
  user: UserDisplayUser;
  size?: UserDisplaySize;
  layout?: UserDisplayLayout;
  groupStack?: UserDisplayGroupStack;
  excludeGroupIds?: string[];
  showName?: boolean;
  showEmail?: boolean;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const nameSizeClass: Record<UserDisplaySize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

const stackSizeForDisplay: Record<UserDisplaySize, UserGroupStackSize> = {
  xs: "xs",
  sm: "xs",
  md: "sm",
  lg: "sm",
};

const layoutGapClass: Record<UserDisplayLayout, string> = {
  inline: "gap-1.5",
  row: "gap-2.5",
  card: "gap-3",
};

export function UserDisplay({
  user,
  size = "md",
  layout = "row",
  groupStack = "auto",
  excludeGroupIds,
  showName = true,
  showEmail = false,
  badges,
  meta,
  trailing,
  onClick,
  className,
}: UserDisplayProps) {
  const Component = onClick ? "button" : "div";
  const stack =
    groupStack === "hidden" ? null : (
      <UserGroupStack
        userId={user.id}
        variant={groupStack === "collapsed" ? "collapsed" : "inline"}
        size={stackSizeForDisplay[size]}
        excludeGroupIds={excludeGroupIds}
      />
    );

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center w-full",
        layoutGapClass[layout],
        onClick && "text-left hover:bg-accent/50 rounded-md transition-colors",
        className
      )}
    >
      <UserAvatar user={user} size={size} />

      {showName && (
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "truncate font-medium",
                nameSizeClass[size]
              )}
            >
              {user.full_name || "Unknown"}
            </span>
            {badges}
            {layout !== "card" && stack}
          </div>
          {showEmail && user.email && (
            <span className="text-xs text-muted-foreground truncate">
              {user.email}
            </span>
          )}
          {meta && (
            <div className="text-xs text-muted-foreground truncate">{meta}</div>
          )}
          {layout === "card" && stack && (
            <div className="mt-1.5">{stack}</div>
          )}
        </div>
      )}

      {trailing && (
        <div className="ml-auto shrink-0 flex items-center">{trailing}</div>
      )}
    </Component>
  );
}
