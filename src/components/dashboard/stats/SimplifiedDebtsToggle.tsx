import { useHaptics } from "@/hooks/use-haptics";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoIcon, Loader2Icon, TrendingDownIcon } from "@/components/ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { getSemanticStatusColors } from "@/lib/status-colors";

interface SimplifiedDebtsToggleProps {
  isSimplified: boolean;
  onToggle: (simplified: boolean) => void;
  rawCount: number;
  simplifiedCount: number;
  disabled?: boolean;
  isUpdating?: boolean;
}

/**
 * Toggle + CTA for switching between raw and simplified debt views.
 *
 * Shows a clear "Minimize transfers" action when multi-party balances exist
 * and simplification is not yet enabled.
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
  const { tap, success } = useHaptics();
  const successColors = getSemanticStatusColors("success");

  const reductionPercent =
    rawCount > 0 ? Math.round(((rawCount - simplifiedCount) / rawCount) * 100) : 0;

  const showReduction = rawCount > simplifiedCount && simplifiedCount > 0;
  const canMinimize = !isSimplified && rawCount >= 2 && !disabled;

  const handleMinimize = () => {
    success();
    onToggle(true);
  };

  return (
    <div className="space-y-3">
      {canMinimize && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {t("debts.minimizeTransfersTitle", "Minimize transfers")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                "debts.minimizeTransfersDescription",
                "Settle multi-party balances with fewer payments. Totals stay the same."
              )}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 cursor-pointer gap-2"
            onClick={handleMinimize}
            disabled={isUpdating || rawCount === 0}
          >
            {isUpdating ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingDownIcon className="h-4 w-4" />
            )}
            {t("debts.minimizeTransfers", "Minimize transfers")}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="simplify-debts"
            checked={isSimplified}
            onCheckedChange={(v) => {
              tap();
              onToggle(v);
            }}
            disabled={disabled || isUpdating || rawCount === 0}
          />
          {isUpdating && (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          <Label htmlFor="simplify-debts" className="text-sm font-medium cursor-pointer">
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
              <span className={`ml-1 ${successColors.text}`}>
                ({reductionPercent}% {t("debts.fewer", "fewer")})
              </span>
            )}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default SimplifiedDebtsToggle;
