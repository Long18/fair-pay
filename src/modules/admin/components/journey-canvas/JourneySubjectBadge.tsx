import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface JourneySubjectUser {
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
}

function subjectInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

interface JourneySubjectBadgeProps {
  user: JourneySubjectUser;
  className?: string;
}

export function JourneySubjectBadge({ user, className }: JourneySubjectBadgeProps) {
  return (
    <div
      className={cn(
        "flex max-w-[min(220px,calc(100%-1rem))] items-center gap-2 rounded-full border border-border/70 bg-card/90 px-2 py-1 shadow-sm backdrop-blur-md",
        className,
      )}
      data-slot="journey-subject-badge"
    >
      <Avatar className="h-7 w-7 shrink-0 ring-2 ring-primary/20">
        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
        <AvatarFallback className="text-[10px] font-semibold">
          {subjectInitials(user.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-semibold text-foreground">{user.fullName}</p>
        {user.email ? (
          <p className="truncate text-[10px] text-muted-foreground" translate="no">
            {user.email}
          </p>
        ) : null}
      </div>
    </div>
  );
}
