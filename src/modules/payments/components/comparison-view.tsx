import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import type { SimplifiedBalance } from "../hooks/use-simplified-balances";

interface ComparisonViewProps {
  originalDebts: SimplifiedBalance[];
  simplifiedDebts: SimplifiedBalance[];
  currency?: string;
}

function getInitials(name: string): string {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * Find which original debts are related to a simplified debt.
 * A simplified debt from A→B absorbs original debts where A is a debtor or B is a creditor.
 */
function getRelatedOriginalIndices(
  simplified: SimplifiedBalance,
  originalDebts: SimplifiedBalance[]
): Set<number> {
  const indices = new Set<number>();
  for (let i = 0; i < originalDebts.length; i++) {
    const orig = originalDebts[i];
    if (
      orig.from_user_id === simplified.from_user_id ||
      orig.to_user_id === simplified.to_user_id
    ) {
      indices.add(i);
    }
  }
  return indices;
}


function DebtItem({
  debt,
  currency,
  isHighlighted,
  onHover,
  onLeave,
}: {
  debt: SimplifiedBalance;
  currency: string;
  isHighlighted: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 transition-colors",
        isHighlighted
          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
          : "border-border bg-background"
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      role="listitem"
      tabIndex={0}
    >
      <Avatar className="size-6">
        <AvatarImage
          src={debt.from_user_avatar_url || undefined}
          alt={debt.from_user_name}
        />
        <AvatarFallback className="text-[10px]">
          {getInitials(debt.from_user_name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium">{debt.from_user_name}</span>
      <ArrowRightIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <Avatar className="size-6">
        <AvatarImage
          src={debt.to_user_avatar_url || undefined}
          alt={debt.to_user_name}
        />
        <AvatarFallback className="text-[10px]">
          {getInitials(debt.to_user_name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium">{debt.to_user_name}</span>
      <span className="ml-auto shrink-0 text-sm font-semibold">
        {formatNumber(debt.amount)} {currency}
      </span>
    </div>
  );
}

export function ComparisonView({
  originalDebts,
  simplifiedDebts,
  currency = "₫",
}: ComparisonViewProps) {
  const { t } = useTranslation();
  const [hoveredSimplifiedIndex, setHoveredSimplifiedIndex] = useState<number | null>(null);

  const highlightedOriginalIndices = useMemo(() => {
    if (hoveredSimplifiedIndex === null) return new Set<number>();
    const simplified = simplifiedDebts[hoveredSimplifiedIndex];
    if (!simplified) return new Set<number>();
    return getRelatedOriginalIndices(simplified, originalDebts);
  }, [hoveredSimplifiedIndex, simplifiedDebts, originalDebts]);

  const originalTotal = useMemo(
    () => originalDebts.reduce((sum, d) => sum + d.amount, 0),
    [originalDebts]
  );
  const simplifiedTotal = useMemo(
    () => simplifiedDebts.reduce((sum, d) => sum + d.amount, 0),
    [simplifiedDebts]
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Original Debts */}
      <Card className="py-4">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {t("debts.originalDebts", "Original Debts")}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {originalDebts.length} {t("debts.transactions", "transactions")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" role="list" aria-label={t("debts.originalDebts", "Original Debts")}>
            {originalDebts.map((debt, index) => (
              <DebtItem
                key={`${debt.from_user_id}-${debt.to_user_id}`}
                debt={debt}
                currency={currency}
                isHighlighted={highlightedOriginalIndices.has(index)}
                onHover={() => {}}
                onLeave={() => {}}
              />
            ))}
            {originalDebts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("debts.noDebts", "No debts")}
              </p>
            )}
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>{t("debts.totalTransferred", "Total transferred")}</span>
            <span className="font-medium">
              {formatNumber(originalTotal)} {currency}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Simplified Debts */}
      <Card className="border-blue-200 dark:border-blue-800 py-4">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {t("debts.simplifiedDebts", "Simplified Debts")}
            </CardTitle>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs"
            >
              {simplifiedDebts.length} {t("debts.transactions", "transactions")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" role="list" aria-label={t("debts.simplifiedDebts", "Simplified Debts")}>
            {simplifiedDebts.map((debt, index) => (
              <DebtItem
                key={`${debt.from_user_id}-${debt.to_user_id}`}
                debt={debt}
                currency={currency}
                isHighlighted={hoveredSimplifiedIndex === index}
                onHover={() => setHoveredSimplifiedIndex(index)}
                onLeave={() => setHoveredSimplifiedIndex(null)}
              />
            ))}
            {simplifiedDebts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("debts.noDebts", "No debts")}
              </p>
            )}
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>{t("debts.totalTransferred", "Total transferred")}</span>
            <span className="font-medium">
              {formatNumber(simplifiedTotal)} {currency}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
