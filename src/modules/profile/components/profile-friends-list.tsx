import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserIcon, ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
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
                <Skeleton className="h-8 w-8" />
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
      {friends.map((friend) => (
        <motion.div
          key={friend.id}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className="rounded-lg cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => go({ to: `/profile/${friend.id}` })}
          >
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

                <ChevronRightIcon size={20} className="text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      <motion.div variants={itemVariants}>
        <Button
          variant="outline"
          className="w-full rounded-lg"
          onClick={() => go({ to: "/friends" })}
        >
          <PlusIcon size={16} className="mr-2" />
          {t('profile.friends.addNew', 'Add New Friend')}
        </Button>
      </motion.div>
    </motion.div>
  );
};