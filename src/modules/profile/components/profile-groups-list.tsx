import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/locale-utils";
import { UsersIcon, ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
import { useGo } from "@refinedev/core";
import { EmptyGroups } from "./profile-empty-states";
import { useHaptics } from "@/hooks/use-haptics";

interface Group {
  id: string;
  name: string;
  created_at: string;
  avatar_url?: string;
}

interface ProfileGroupsListProps {
  groups: Group[];
  isLoading?: boolean;
  className?: string;
}

export const ProfileGroupsList = ({
  groups,
  isLoading,
  className,
}: ProfileGroupsListProps) => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

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
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return <EmptyGroups className={className} />;
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
      {groups.map((group) => (
        <motion.div
          key={group.id}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className="rounded-lg cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { tap(); go({ to: `/groups/show/${group.id}` }); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                    <UsersIcon size={20} />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-1">{group.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.groups.createdOn', {
                      date: formatDateShort(group.created_at),
                      defaultValue: `Created ${formatDateShort(group.created_at)}`
                    })}
                  </p>
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
          onClick={() => { tap(); go({ to: "/groups/create" }); }}
        >
          <PlusIcon size={16} className="mr-2" />
          {t('profile.groups.createNew', 'Create New Group')}
        </Button>
      </motion.div>
    </motion.div>
  );
};