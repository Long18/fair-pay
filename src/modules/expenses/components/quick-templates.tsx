import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  UtensilsIcon,
  CarIcon,
  ShoppingCartIcon,
  ZapIcon,
  CoffeeIcon,
  FilmIcon,
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

  return (
    <div className={cn("space-y-2 overflow-x-hidden max-w-full", className)}>
      <label className="text-sm font-medium text-muted-foreground">{t("expenses.quickTemplates")}</label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
        {templateConfigs.map((template) => {
          const description = t(template.descriptionKey);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate({
                description,
                category: template.category,
                amount: template.amount,
              })}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap transition-all",
                "hover:bg-accent hover:border-accent-foreground/20",
                selectedTemplate === description
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border"
              )}
            >
              <span className={cn(
                "p-1 rounded",
                selectedTemplate === description
                  ? "bg-primary/20"
                  : "bg-muted"
              )}>
                {template.icon}
              </span>
              <span className="text-sm font-medium">{t(template.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
