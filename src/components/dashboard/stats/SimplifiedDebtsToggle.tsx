import { useHaptics } from "@/hooks/use-haptics";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoIcon, Loader2Icon } from "@/components/ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface SimplifiedDebtsToggleProps {
  isSimplified: boolean;
  onToggle: (simplified: boolean) => void;
  rawCount: number;
  simplifiedCount: number;
  disabled?: boolean;
  isUpdating?: boolean;
}

/**
 * Toggle component for switching between raw and simplified debt views
 *
 * Displays:
 * - Switch to enable/disable simplification
 * - Transaction count reduction badge
 * - Info tooltip explaining the feature
 *
 * Example: "5 transactions → 2 transactions (60% fewer)"
 */
export function SimplifiedDebtsToggle({
  isSimplified,
  onToggle,
  rawCount,
  simplifiedCount,
  disabled = false,
  isUpdating = false,
}: SimplifiedDebtsToggleProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  // Calculate reduction percentage
  const reductionPercent = rawCount > 0
    ? Math.round(((rawCount - simplifiedCount) / rawCount) * 100)
    : 0;

  const showReduction = rawCount > simplifiedCount && simplifiedCount > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Switch
          id="simplify-debts"
          checked={isSimplified}
          onCheckedChange={(v) => { tap(); onToggle(v); }}
          disabled={disabled || isUpdating || rawCount === 0}
        />
        {isUpdating && (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        <Label
          htmlFor="simplify-debts"
          className="text-sm font-medium cursor-pointer"
        >
          {t("debts.simplify", "Simplify Debts")}
        </Label>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-auto p-0 hover:bg-transparent"
              >
                <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                {t(
                  "debts.simplifyTooltip",
                  "Combines multiple payments into fewer transactions using smart optimization. The total amount owed remains the same."
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {showReduction && isSimplified && (
        <Badge variant="secondary" className="text-xs">
          {rawCount} → {simplifiedCount} {t("debts.transactions", "transactions")}
          {reductionPercent > 0 && (
            <span className="ml-1 text-green-600 dark:text-green-400">
              ({reductionPercent}% {t("debts.fewer", "fewer")})
            </span>
          )}
        </Badge>
      )}
    </div>
  );
}

export default SimplifiedDebtsToggle;
