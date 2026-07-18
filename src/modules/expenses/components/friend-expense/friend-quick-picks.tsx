import React from "react";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import {
  coffeeIcon,
  lunchIcon,
  taxiIcon,
  shoppingIcon,
  groceriesIcon,
  moreOptionsIcon,
} from "@/assets/expense-friend";

interface QuickPick {
  id: string;
  labelKey: string;
  descriptionKey: string;
  category: string;
  iconSrc: string;
}

const PICKS: QuickPick[] = [
  { id: "coffee", labelKey: "expenses.templateCoffee", descriptionKey: "expenses.templateCoffeeDesc", category: "Food & Drink", iconSrc: coffeeIcon },
  { id: "lunch", labelKey: "expenses.templateLunch", descriptionKey: "expenses.templateLunchDesc", category: "Food & Drink", iconSrc: lunchIcon },
  { id: "taxi", labelKey: "expenses.templateTaxi", descriptionKey: "expenses.templateTaxiDesc", category: "Transportation", iconSrc: taxiIcon },
  { id: "groceries", labelKey: "expenses.templateGroceries", descriptionKey: "expenses.templateGroceriesDesc", category: "Shopping", iconSrc: groceriesIcon },
  { id: "shopping", labelKey: "expenses.templateGroceries", descriptionKey: "expenses.templateGroceriesDesc", category: "Shopping", iconSrc: shoppingIcon },
];

interface FriendQuickPicksProps {
  selected: string | null;
  onSelect: (template: { description: string; category: string; amount?: number }) => void;
  onMore?: () => void;
  className?: string;
}

export const FriendQuickPicks: React.FC<FriendQuickPicksProps> = ({
  selected,
  onSelect,
  onMore,
  className,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  return (
    <div className={cn("max-w-full overflow-x-hidden", className)}>
      <ul
        aria-label={t("expenses.quickTemplates")}
        className="flex list-none gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1 snap-x snap-mandatory m-0 p-0"
      >
        {PICKS.map((pick) => {
          const description = t(pick.descriptionKey);
          const isActive = selected === description;
          return (
            <li key={pick.id} className="shrink-0 snap-start">
              <button
                type="button"
                aria-pressed={isActive}
                aria-label={t(pick.labelKey)}
                onClick={() => {
                  tap();
                  onSelect({ description, category: pick.category });
                }}
                className={cn(
                  "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-all",
                  "hover:bg-accent hover:border-accent-foreground/20",
                  isActive
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border"
                )}
              >
                <span className="h-7 w-7 rounded-full bg-muted/40 flex items-center justify-center overflow-hidden">
                  <img src={pick.iconSrc} alt="" className="h-7 w-7 object-contain" />
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{t(pick.labelKey)}</span>
              </button>
            </li>
          );
        })}

        {onMore && (
          <li className="shrink-0 snap-start">
            <button
              type="button"
              aria-label={t("common.more", { defaultValue: "More" })}
              onClick={() => { tap(); onMore(); }}
              className={cn(
                "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border bg-background border-border",
                "hover:bg-accent hover:border-accent-foreground/20 transition-all"
              )}
            >
              <span className="h-7 w-7 rounded-full bg-muted/40 flex items-center justify-center overflow-hidden">
                <img src={moreOptionsIcon} alt="" className="h-7 w-7 object-contain" />
              </span>
              <span className="text-sm font-medium whitespace-nowrap">
                {t("common.more", { defaultValue: "More" })}
              </span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};
