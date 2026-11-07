import React from "react";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import {
  UtensilsIcon,
  CarIcon,
  ShoppingCartIcon,
  ZapIcon,
  CoffeeIcon,
  FilmIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

interface Template {
  id: string;
  labelKey: string;
  descriptionKey: string;
  category: string;
  icon: React.ReactNode;
  amount?: number;
}

interface QuickTemplatesProps {
  onSelectTemplate: (template: {
    description: string;
    category: string;
    amount?: number;
  }) => void;
  selectedTemplate: string | null;
  className?: string;
}

const templateConfigs: Template[] = [
  {
    id: "lunch",
    labelKey: "expenses.templateLunch",
    descriptionKey: "expenses.templateLunchDesc",
    category: "Food & Drink",
    icon: <UtensilsIcon className="h-4 w-4" />,
  },
  {
    id: "coffee",
    labelKey: "expenses.templateCoffee",
    descriptionKey: "expenses.templateCoffeeDesc",
    category: "Food & Drink",
    icon: <CoffeeIcon className="h-4 w-4" />,
  },
  {
    id: "taxi",
    labelKey: "expenses.templateTaxi",
    descriptionKey: "expenses.templateTaxiDesc",
    category: "Transportation",
    icon: <CarIcon className="h-4 w-4" />,
  },
  {
    id: "groceries",
    labelKey: "expenses.templateGroceries",
    descriptionKey: "expenses.templateGroceriesDesc",
    category: "Shopping",
    icon: <ShoppingCartIcon className="h-4 w-4" />,
  },
  {
    id: "movie",
    labelKey: "expenses.templateMovie",
    descriptionKey: "expenses.templateMovieDesc",
    category: "Entertainment",
    icon: <FilmIcon className="h-4 w-4" />,
  },
  {
    id: "utilities",
    labelKey: "expenses.templateUtilities",
    descriptionKey: "expenses.templateUtilitiesDesc",
    category: "Utilities",
    icon: <ZapIcon className="h-4 w-4" />,
  },
];

export const QuickTemplates: React.FC<QuickTemplatesProps> = ({
  onSelectTemplate,
  selectedTemplate,
  className,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  return (
    <div className={cn("min-w-0 w-full space-y-2", className)}>
      <div className="text-sm font-medium text-muted-foreground">
        {t("expenses.quickTemplates")}
      </div>
      <div className="relative min-w-0">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-background to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent pr-0.5 md:w-8"
          aria-hidden="true"
        >
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground/70 md:hidden" />
        </div>
        <ul
          aria-label={t("expenses.quickTemplates")}
          className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-2 scrollbar-none -mx-1 scroll-px-1 px-1 snap-x snap-mandatory"
        >
          {templateConfigs.map((template) => {
            const description = t(template.descriptionKey);
            return (
              <li key={template.id} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => {
                  tap();
                  onSelectTemplate({
                    description,
                    category: template.category,
                    amount: template.amount,
                  });
                }}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 transition-all",
                  "hover:bg-accent hover:border-accent-foreground/20",
                  selectedTemplate === description
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background",
                )}
              >
                <span
                  className={cn(
                    "rounded p-1",
                    selectedTemplate === description ? "bg-primary/20" : "bg-muted",
                  )}
                >
                  {template.icon}
                </span>
                <span className="text-sm font-medium">{t(template.labelKey)}</span>
              </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
