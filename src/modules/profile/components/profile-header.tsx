import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Profile } from "../types";
import { formatDateShort } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { CameraIcon, PencilIcon, ShareIcon } from "@/components/ui/icons";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile: boolean;
  onEditClick?: () => void;
  onAvatarClick?: () => void;
  onShareClick?: () => void;
  isUploadingAvatar?: boolean;
  className?: string;
}

export const ProfileHeader = ({
  profile,
  isOwnProfile,
  onEditClick,
  onAvatarClick,
  onShareClick,
  isUploadingAvatar,
  className,
}: ProfileHeaderProps) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("relative", className)}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl" />

      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-6">
        {/* Avatar */}
        <motion.div
          whileHover={isOwnProfile ? { scale: 1.05 } : {}}
          whileTap={isOwnProfile ? { scale: 0.95 } : {}}
          className="relative"
        >
          <Avatar
            className={cn(
              "h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl",
              isOwnProfile && "cursor-pointer",
              isUploadingAvatar && "opacity-50"
            )}
            onClick={isOwnProfile ? () => { tap(); onAvatarClick?.(); } : undefined}
          >
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl sm:text-3xl bg-gradient-to-br from-primary/20 to-primary/10">
              {profile.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          {isOwnProfile && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg"
            >
              <CameraIcon size={16} />
            </motion.div>
          )}

          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
        </motion.div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{profile.full_name}</h1>
            <Badge variant="secondary" className="rounded-full">
              {t('profile.memberSince', {
                date: formatDateShort(profile.created_at),
                defaultValue: `Member since ${formatDateShort(profile.created_at)}`
              })}
            </Badge>
          </div>

          {profile.email && (
            <p className="text-muted-foreground mb-4">{profile.email}</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center sm:justify-start">
            {isOwnProfile && (
              <Button
                onClick={() => { tap(); onEditClick?.(); }}
                variant="default"
                size="sm"
                className="rounded-lg"
              >
                <PencilIcon size={16} className="mr-2" />
                {t('profile.edit', 'Edit Profile')}
              </Button>
            )}

            <Button
              onClick={() => { tap(); onShareClick?.(); }}
              variant="outline"
              size="sm"
              className="rounded-lg"
            >
              <ShareIcon size={16} className="mr-2 sm:mr-0" />
              <span className="sm:sr-only">{t('common.share', 'Share')}</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
