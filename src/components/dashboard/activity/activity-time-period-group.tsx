import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/hooks/use-haptics";

import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { TimePeriodGroup } from "@/lib/activity-grouping";
import type { EnhancedActivityListVariant } from "./enhanced-activity-list";
import { EnhancedActivityRow } from "./enhanced-activity-row";

// =============================================
// Component Props
// =============================================

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

// =============================================
// Activity Time Period Group Component
// =============================================

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
  const { tap } = useHaptics();
  const hasActivities = group.activities.length > 0;

  if (!hasActivities) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Group Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { tap(); onToggleGroup(); }}
          className={cn(
            "flex items-center gap-2 text-sm font-semibold text-foreground",
            "hover:text-foreground/80 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md px-2 py-1"
          )}
          aria-label={group.isCollapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
          aria-expanded={!group.isCollapsed}
        >
          {group.isCollapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
          <span>{group.label}</span>
          <span className="text-muted-foreground font-normal">
            ({group.activities.length})
          </span>
        </button>
      </div>

      {/* Group Activities */}
      <AnimatePresence initial={false}>
        {!group.isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden space-y-2"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
