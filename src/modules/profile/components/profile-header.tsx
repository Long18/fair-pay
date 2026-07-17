import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/components/user-display";
import { Profile } from "../types";
import { formatDateShort } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import {
  CameraIcon,
  PencilIcon,
  ShareIcon,
  RotateCcwIcon,
  MailIcon,
  CalendarIcon,
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { useOnboarding } from "@/modules/onboarding";
import { usePlan } from "@/modules/billing";
import type { ReactNode } from "react";

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile: boolean;
  onEditClick?: () => void;
  onAvatarClick?: () => void;
  onShareClick?: () => void;
  isUploadingAvatar?: boolean;
  tabs?: ReactNode;
  className?: string;
}

export const ProfileHeader = ({
  profile,
  isOwnProfile,
  onEditClick,
  onAvatarClick,
  onShareClick,
  isUploadingAvatar,
  tabs,
  className,
}: ProfileHeaderProps) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const { restart } = useOnboarding();
  const { isPro } = usePlan();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("relative overflow-hidden rounded-xl border bg-card", className)}
    >
      {/* Cover banner */}
      <div
        className="relative h-36 sm:h-44 w-full overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,oklch(0.72_0.12_195)_0%,transparent_55%),radial-gradient(ellipse_at_80%_20%,oklch(0.78_0.14_85)_0%,transparent_50%),radial-gradient(ellipse_at_60%_90%,oklch(0.65_0.14_220)_0%,transparent_55%),linear-gradient(135deg,oklch(0.55_0.14_210)_0%,oklch(0.62_0.1_180)_50%,oklch(0.7_0.08_90)_100%)]" />
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><circle cx=%222%22 cy=%222%22 r=%221%22 fill=%22white%22 opacity=%220.35%22/></svg>')]" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute left-10 bottom-0 h-24 w-24 rounded-full bg-primary/30 blur-xl" />
      </div>

      <div className="relative px-4 sm:px-6 pb-0">
        {/* Avatar overlapping cover */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
          <motion.div
            whileHover={isOwnProfile ? { scale: 1.03 } : undefined}
            whileTap={isOwnProfile ? { scale: 0.97 } : undefined}
            className="relative mx-auto sm:mx-0 shrink-0"
          >
            <Avatar
              className={cn(
                "h-24 w-24 sm:h-28 sm:w-28 border-4 border-card shadow-lg",
                isOwnProfile && "cursor-pointer",
                isUploadingAvatar && "opacity-50",
              )}
              onClick={
                isOwnProfile
                  ? () => {
                      tap();
                      onAvatarClick?.();
                    }
                  : undefined
              }
            >
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="text-2xl bg-primary/15 text-primary">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>

            {isOwnProfile && (
              <div className="absolute bottom-1 right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md">
                <CameraIcon size={14} />
              </div>
            )}

            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/40">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </motion.div>

          <div className="flex-1 min-w-0 pb-2 text-center sm:text-left sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">
                {profile.full_name}
              </h1>
              {isOwnProfile && isPro && (
                <Badge className="mx-auto sm:mx-0 w-fit rounded-full bg-amber-500 text-white border-0 text-xs">
                  Pro
                </Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profile.email && (
                <span className="inline-flex items-center gap-1.5 max-w-full">
                  <MailIcon size={14} className="shrink-0 opacity-70" />
                  <span className="truncate">{profile.email}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon size={14} className="shrink-0 opacity-70" />
                {t("profile.joined", {
                  date: formatDateShort(profile.created_at),
                  defaultValue: `Joined ${formatDateShort(profile.created_at)}`,
                })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center sm:justify-end gap-2 pb-4 sm:ml-auto">
            {isOwnProfile && (
              <Button
                onClick={() => {
                  tap();
                  onEditClick?.();
                }}
                size="sm"
                className="rounded-lg"
              >
                <PencilIcon size={16} className="mr-2" />
                {t("profile.edit", "Edit Profile")}
              </Button>
            )}
            <Button
              onClick={() => {
                tap();
                onShareClick?.();
              }}
              variant="outline"
              size="sm"
              className="rounded-lg"
              aria-label={t("common.share", "Share")}
            >
              <ShareIcon size={16} />
            </Button>
            {isOwnProfile && (
              <Button
                onClick={() => {
                  tap();
                  restart();
                }}
                variant="ghost"
                size="icon"
                className="rounded-lg h-9 w-9"
                aria-label={t("onboarding.actions.restart", "Restart Tutorial")}
              >
                <RotateCcwIcon size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Header tabs */}
        {tabs ? (
          <div className="border-t -mx-4 sm:-mx-6 px-2 sm:px-4 overflow-x-auto">
            {tabs}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};
