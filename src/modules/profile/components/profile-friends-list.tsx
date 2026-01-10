import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserIcon, ArrowRightIcon } from "@/components/ui/icons";
import { useGo } from "@refinedev/core";
import { EmptyFriends } from "./profile-empty-states";

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

interface ProfileFriendsListProps {
  friends: Friend[];
  isLoading?: boolean;
  className?: string;
}

export const ProfileFriendsList = ({
  friends,
  isLoading,
  className,
}: ProfileFriendsListProps) => {
  const { t } = useTranslation();
  const go = useGo();

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return <EmptyFriends className={className} />;
  }

  // Show only top 3-5 friends as preview
  const previewFriends = friends.slice(0, 5);
  const hasMore = friends.length > 5;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-3", className)}
    >
      {/* Friends Count Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {t('profile.friends.count', {
            count: friends.length,
            defaultValue: `${friends.length} friend${friends.length !== 1 ? 's' : ''}`
          })}
        </p>
      </div>

      {/* Preview List (top 3-5 friends, view-only) */}
      {previewFriends.map((friend) => (
        <motion.div
          key={friend.id}
          variants={itemVariants}
        >
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={friend.avatar_url || undefined} alt={friend.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                    {friend.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || <UserIcon size={20} />}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-1">{friend.full_name}</h4>
                  {friend.email && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {friend.email}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* View All Friends Button */}
      <motion.div variants={itemVariants}>
        <Button
          variant="outline"
          className="w-full rounded-lg"
          onClick={() => go({ to: "/friends" })}
        >
          <span className="flex-1 text-center">
            {hasMore
              ? t('profile.friends.viewAll', `View All ${friends.length} Friends`)
              : t('profile.friends.manageFriends', 'Manage Friends')}
          </span>
          <ArrowRightIcon size={16} className="ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
};
