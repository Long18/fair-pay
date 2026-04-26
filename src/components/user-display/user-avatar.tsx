import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type UserAvatarSize = "xs" | "sm" | "md" | "lg";

export function getInitials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const sizeClass: Record<UserAvatarSize, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const fallbackTextClass: Record<UserAvatarSize, string> = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

interface UserAvatarProps {
  user: {
    full_name: string | null;
    avatar_url: string | null;
  };
  size?: UserAvatarSize;
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const initials = getInitials(user.full_name);
  const altName = user.full_name ?? "User";

  return (
    <Avatar className={cn(sizeClass[size], "shrink-0", className)}>
      {user.avatar_url ? (
        <AvatarImage src={user.avatar_url} alt={altName} />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-primary/10 text-primary font-medium",
          fallbackTextClass[size]
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
