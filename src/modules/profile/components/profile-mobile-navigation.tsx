import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  PencilIcon,
  ShareIcon,
  MoreVerticalIcon,
  BanknoteIcon
} from "@/components/ui/icons";
import { useGo } from "@refinedev/core";

interface ProfileMobileNavigationProps {
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  onShareClick?: () => void;
  onSettleClick?: () => void;
  showSettle?: boolean;
  className?: string;
}

export const ProfileMobileNavigation = ({
  isOwnProfile = false,
  onEditClick,
  onShareClick,
  onSettleClick,
  showSettle = false,
  className,
}: ProfileMobileNavigationProps) => {
  const { t } = useTranslation();
  const go = useGo();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 md:hidden",
          "bg-background/95 backdrop-blur-lg border-t",
          className
        )}
      >
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go({ to: "/dashboard" })}
              className="rounded-lg"
            >
              <ArrowLeftIcon size={20} className="mr-2" />
              {t("common.back", "Back")}
            </Button>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {showSettle && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSettleClick}
                  className="rounded-lg"
                >
                  <BanknoteIcon size={20} className="mr-2" />
                  {t("profile.settle", "Settle")}
                </Button>
              )}

              {isOwnProfile && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onEditClick}
                  className="rounded-lg"
                >
                  <PencilIcon size={20} className="mr-2" />
                  {t("profile.edit", "Edit")}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onShareClick}
                className="rounded-lg"
              >
                <ShareIcon size={20} />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
