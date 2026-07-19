import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { ItemGroup } from "@/components/ui/item";
import { useHaptics } from "@/hooks/use-haptics";

import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { TimePeriodGroup } from "@/lib/activity-grouping";
import type { EnhancedActivityListVariant } from "./enhanced-activity-list";
import { EnhancedActivityRow } from "./enhanced-activity-row";

export interface ActivityTimePeriodGroupProps {
  group: TimePeriodGroup;
  currentUserId: string;
  expandedActivityIds: Set<string>;
  onToggleActivity: (activityId: string) => void;
  onToggleGroup: () => void;
  duplicateIds: Set<string>;
  showActions?: boolean;
  variant?: EnhancedActivityListVariant;
  className?: string;
}

export const ActivityTimePeriodGroup: React.FC<ActivityTimePeriodGroupProps> = ({
  group,
  currentUserId,
  expandedActivityIds,
  onToggleActivity,
  onToggleGroup,
  duplicateIds,
  showActions = false,
  variant = "default",
  className,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const hasActivities = group.activities.length > 0;
  const isDashboard = variant === "dashboard";
  const labelByPeriod = {
    today: t("dashboard.activityFeed.time.today", "Today"),
    this_week: t("dashboard.activityFeed.time.thisWeek", "This Week"),
    this_month: t("dashboard.activityFeed.time.thisMonth", "This Month"),
    earlier: t("dashboard.activityFeed.time.earlier", "Earlier"),
  } as const;

  if (!hasActivities) {
    return null;
  }

  return (
    <div className={cn(isDashboard ? "space-y-0" : "space-y-3", className)}>
      <div className={cn("flex items-center gap-2", isDashboard && "px-3 py-2")}>
        <button
          type="button"
          onClick={() => {
            tap();
            onToggleGroup();
          }}
          className={cn(
            "flex items-center gap-2 rounded-md px-1 py-1 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            isDashboard
              ? "text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
              : "text-sm font-semibold text-foreground hover:text-foreground/80"
          )}
          aria-label={
            group.isCollapsed
              ? t("dashboard.activityFeed.time.expandGroup", {
                  defaultValue: "Expand {{label}}",
                  label: labelByPeriod[group.period],
                })
              : t("dashboard.activityFeed.time.collapseGroup", {
                  defaultValue: "Collapse {{label}}",
                  label: labelByPeriod[group.period],
                })
          }
          aria-expanded={!group.isCollapsed}
        >
          {group.isCollapsed ? (
            <ChevronRightIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )}
          <span>{labelByPeriod[group.period]}</span>
          <span
            className={cn(
              "font-normal tabular-nums",
              isDashboard ? "text-muted-foreground/80" : "text-muted-foreground"
            )}
          >
            ({group.activities.length})
          </span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!group.isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {isDashboard ? (
              <ItemGroup className="divide-y divide-border">
                {group.activities.map((activity) => (
                  <EnhancedActivityRow
                    key={activity.id}
                    activity={activity}
                    currentUserId={currentUserId}
                    isExpanded={expandedActivityIds.has(activity.id)}
                    onToggleExpand={() => onToggleActivity(activity.id)}
                    showDuplicateContext={duplicateIds.has(activity.id)}
                    showActions={showActions}
                    variant={variant}
                  />
                ))}
              </ItemGroup>
            ) : (
              <AnimatedList items={group.activities} className="space-y-2">
                {group.activities.map((activity, index) => (
                  <AnimatedRow key={activity.id} index={index}>
                    <EnhancedActivityRow
                      activity={activity}
                      currentUserId={currentUserId}
                      isExpanded={expandedActivityIds.has(activity.id)}
                      onToggleExpand={() => onToggleActivity(activity.id)}
                      showDuplicateContext={duplicateIds.has(activity.id)}
                      showActions={showActions}
                      variant={variant}
                    />
                  </AnimatedRow>
                ))}
              </AnimatedList>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
