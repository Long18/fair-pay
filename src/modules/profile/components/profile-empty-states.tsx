import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  UsersIcon,
  GroupIcon,
  PlusIcon,
  ReceiptIcon,
  ScaleIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";

interface EmptyStateProps {
  className?: string;
  onAction?: () => void;
}

export const EmptyActivities = ({ className, onAction }: EmptyStateProps) => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("text-center py-12", className)}
    >
      <div className="relative mx-auto w-24 h-24 mb-4">
        <ActivityIcon
          size={64}
          className="absolute inset-0 m-auto text-muted-foreground/20"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <SparklesIcon
            size={24}
            className="absolute top-0 right-0 text-primary/50"
          />
        </motion.div>
      </div>

      <h3 className="font-semibold text-lg mb-2">
        {t("profile.empty.activities.title", "No Activities Yet")}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {t(
          "profile.empty.activities.description",
          "Start tracking expenses with friends to see your activity history here"
        )}
      </p>
      <Button
        onClick={() => { tap(); (onAction ?? (() => go({ to: "/expenses/create" })))(); }}
        className="rounded-lg"
      >
        <PlusIcon size={16} className="mr-2" />
        {t("profile.empty.activities.action", "Add First Expense")}
      </Button>
    </motion.div>
  );
};

export const EmptyBalances = ({ className, onAction }: EmptyStateProps) => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("text-center py-12", className)}
    >
      <div className="relative mx-auto w-24 h-24 mb-4">
        <motion.div
          animate={{
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <ScaleIcon
            size={64}
            className="text-muted-foreground/20"
          />
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="absolute -top-2 -right-2"
        >
          <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
            <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
          </div>
        </motion.div>
      </div>

      <h3 className="font-semibold text-lg mb-2">
        {t("profile.empty.balances.title", "All Settled Up!")}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {t(
          "profile.empty.balances.description",
          "You're all settled up with everyone. Great job keeping things balanced!"
        )}
      </p>
      <Button
        variant="outline"
        onClick={() => { tap(); (onAction ?? (() => go({ to: "/expenses/create" })))(); }}
        className="rounded-lg"
      >
        <ReceiptIcon size={16} className="mr-2" />
        {t("profile.empty.balances.action", "Add New Expense")}
      </Button>
    </motion.div>
  );
};

export const EmptyFriends = ({ className, onAction }: EmptyStateProps) => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("text-center py-12", className)}
    >
      <div className="relative mx-auto w-24 h-24 mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <UsersIcon size={64} className="text-muted-foreground/20" />
        </div>
        <motion.div
          animate={{
            x: [-10, 10, -10],
            y: [-5, 5, -5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring" }}
                className="w-4 h-4 bg-primary/20 rounded-full border-2 border-background"
              />
            ))}
          </div>
        </motion.div>
      </div>

      <h3 className="font-semibold text-lg mb-2">
        {t("profile.empty.friends.title", "No Friends Yet")}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {t(
          "profile.empty.friends.description",
          "Add friends to start sharing expenses and keeping track of who owes what"
        )}
      </p>
      <Button
        onClick={() => { tap(); (onAction ?? (() => go({ to: "/friends" })))(); }}
        className="rounded-lg"
      >
        <PlusIcon size={16} className="mr-2" />
        {t("profile.empty.friends.action", "Add Friends")}
      </Button>
    </motion.div>
  );
};

export const EmptyGroups = ({ className, onAction }: EmptyStateProps) => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("text-center py-12", className)}
    >
      <div className="relative mx-auto w-24 h-24 mb-4">
        <GroupIcon size={64} className="text-muted-foreground/20" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full" />
        </motion.div>
      </div>

      <h3 className="font-semibold text-lg mb-2">
        {t("profile.empty.groups.title", "No Groups Yet")}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {t(
          "profile.empty.groups.description",
          "Create or join groups to manage shared expenses with multiple people"
        )}
      </p>
      <Button
        onClick={() => { tap(); (onAction ?? (() => go({ to: "/groups/create" })))(); }}
        className="rounded-lg"
      >
        <PlusIcon size={16} className="mr-2" />
        {t("profile.empty.groups.action", "Create Group")}
      </Button>
    </motion.div>
  );
};