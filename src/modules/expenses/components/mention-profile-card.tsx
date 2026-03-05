import { useState, useCallback, memo, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { supabaseClient } from "@/utility/supabaseClient";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";

interface MentionProfileCardProps {
  userId: string;
  displayText: string;
  className?: string;
  children?: ReactNode;
}

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email?: string;
  created_at: string;
}

export const MentionProfileCard = memo(({
  userId,
  displayText,
  className,
  children,
}: MentionProfileCardProps) => {
  const { t, i18n } = useTranslation();
  const { tap } = useHaptics();
  const go = useGo();
  const dateLocale = i18n.language === "vi" ? vi : enUS;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (fetched || loading) return;
    setLoading(true);
    try {
      const { data } = await supabaseClient
        .from("profiles")
        .select("id, full_name, avatar_url, email, created_at")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [userId, fetched, loading]);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const memberSince = profile?.created_at
    ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: dateLocale })
    : null;

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) fetchProfile();
  }, [fetchProfile]);

  const handleViewProfile = useCallback(() => {
    tap();
    go({ to: `/profile/${userId}` });
  }, [go, userId, tap]);

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        {children ? (
          <span
            role="button"
            tabIndex={0}
            className={cn("focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:rounded-sm", className)}
            onClick={handleViewProfile}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleViewProfile(); } }}
            aria-label={t("expenses.comments.viewProfile", { name: displayText, defaultValue: `View ${displayText}'s profile` })}
          >
            {children}
          </span>
        ) : (
          <button
            type="button"
            className={cn(
              "text-primary font-medium cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:rounded-sm",
              className
            )}
            onClick={handleViewProfile}
            aria-label={t("expenses.comments.viewProfile", { name: displayText, defaultValue: `View ${displayText}'s profile` })}
          >
            {displayText}
          </button>
        )}
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        className="w-72 p-0 overflow-hidden"
      >
        {loading ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ) : profile ? (
          <div>
            {/* Gradient banner */}
            <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
            <div className="px-4 pb-4">
              {/* Avatar overlapping banner */}
              <div className="-mt-8 mb-2">
                <Avatar className="h-14 w-14 border-3 border-background shadow-sm">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                  <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
                </Avatar>
              </div>
              {/* Name & email */}
              <div className="space-y-0.5">
                <p className="text-sm font-semibold leading-tight truncate">{profile.full_name}</p>
                {profile.email && (
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                )}
              </div>
              {/* Member since */}
              {memberSince && (
                <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3 shrink-0" />
                  <span>{t("expenses.comments.memberSince", { time: memberSince, defaultValue: `Joined ${memberSince}` })}</span>
                </div>
              )}
              {/* View profile button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 h-8 text-xs gap-1.5"
                onClick={handleViewProfile}
              >
                {t("expenses.comments.viewProfileButton", "View Profile")}
                <ExternalLinkIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {t("expenses.comments.profileNotFound", "Profile not found")}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
});

MentionProfileCard.displayName = "MentionProfileCard";
