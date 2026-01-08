import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateShort } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ReceiptIcon,
  BanknoteIcon,
  ActivityIcon,
  ChevronRightIcon
} from "@/components/ui/icons";
import { useGo } from "@refinedev/core";

interface ActivityItem {
  id: string;
  type: "expense" | "payment";
  description: string;
  total_amount: number;
  user_share: number;
  currency: string;
  date: string;
  group_name?: string;
  paid_by_name?: string;
  is_lender: boolean;
  is_borrower: boolean;
  is_payment: boolean;
  is_private?: boolean; // For privacy control
}

interface ProfileActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export const ProfileActivityFeed = ({
  activities,
  isLoading,
  onLoadMore,
  hasMore,
  className,
}: ProfileActivityFeedProps) => {
  const { t } = useTranslation();
  const go = useGo();

  const handleActivityClick = (activity: ActivityItem) => {
    // Prevent navigation for private activities (non-involved users)
    if (activity.is_private) {
      return;
    }

    if (activity.type === "expense") {
      go({ to: `/expenses/show/${activity.id}` });
    } else if (activity.type === "payment") {
      go({ to: `/payments/show/${activity.id}` });
    }
  };

  if (isLoading && activities.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={cn("rounded-lg", className)}>
        <CardContent className="p-8 text-center">
          <ActivityIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-2">
            {t('profile.noRecentActivity', 'No recent activity')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('profile.startByAddingExpense', 'Start by adding an expense or payment')}
          </p>
        </CardContent>
      </Card>
    );
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
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      }
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <AnimatePresence mode="popLayout">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              variants={itemVariants}
              layout
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card
                className={cn(
                  "rounded-lg overflow-hidden transition-shadow",
                  activity.is_private
                    ? "cursor-not-allowed opacity-75"
                    : "cursor-pointer hover:shadow-md"
                )}
                onClick={() => handleActivityClick(activity)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Activity Icon */}
                    <div className={cn(
                      "p-2 rounded-full",
                      activity.type === "expense"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    )}>
                      {activity.type === "expense" ? (
                        <ReceiptIcon size={20} />
                      ) : (
                        <BanknoteIcon size={20} />
                      )}
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">
                        {activity.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {formatDateShort(activity.date)}
                        </span>

                        {activity.group_name && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="secondary" className="text-xs rounded-full">
                              {activity.group_name}
                            </Badge>
                          </>
                        )}

                        {activity.paid_by_name && !activity.is_private && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {activity.is_lender
                                ? t('profile.youPaid', 'You paid')
                                : t('profile.paidBy', {
                                    name: activity.paid_by_name,
                                    defaultValue: `Paid by ${activity.paid_by_name}`
                                  })
                              }
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount and Status - Hide for private activities */}
                    {!activity.is_private ? (
                      <div className="text-right">
                        <p className={cn(
                          "font-bold",
                          activity.is_lender ? "text-green-600 dark:text-green-400" :
                          activity.is_borrower ? "text-red-600 dark:text-red-400" :
                          "text-foreground"
                        )}>
                          {activity.is_lender && "+"}
                          {activity.is_borrower && "-"}
                          {formatCurrency(Math.abs(activity.user_share), activity.currency)}
                        </p>

                        {activity.user_share !== activity.total_amount && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('profile.ofTotal', {
                              amount: formatCurrency(activity.total_amount, activity.currency),
                              defaultValue: `of ${formatCurrency(activity.total_amount, activity.currency)}`
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {t('profile.private', 'Private')}
                        </Badge>
                      </div>
                    )}

                    {!activity.is_private && (
                      <ChevronRightIcon size={16} className="text-muted-foreground mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Load More */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center pt-4"
        >
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="rounded-lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                {t('common.loading', 'Loading...')}
              </>
            ) : (
              t('common.loadMore', 'Load More')
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
};
