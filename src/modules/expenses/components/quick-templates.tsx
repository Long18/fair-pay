import React from "react";
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
  label: string;
  description: string;
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

const templates: Template[] = [
  {
    id: "lunch",
    label: "Lunch",
    description: "Lunch with team",
    category: "Food & Drink",
    icon: <UtensilsIcon className="h-4 w-4" />,
  },
  {
    id: "coffee",
    label: "Coffee",
    description: "Coffee",
    category: "Food & Drink",
    icon: <CoffeeIcon className="h-4 w-4" />,
  },
  {
    id: "taxi",
    label: "Taxi",
    description: "Taxi ride",
    category: "Transportation",
    icon: <CarIcon className="h-4 w-4" />,
  },
  {
    id: "groceries",
    label: "Groceries",
    description: "Grocery shopping",
    category: "Shopping",
    icon: <ShoppingCartIcon className="h-4 w-4" />,
  },
  {
    id: "movie",
    label: "Movie",
    description: "Movie tickets",
    category: "Entertainment",
    icon: <FilmIcon className="h-4 w-4" />,
  },
  {
    id: "utilities",
    label: "Utilities",
    description: "Monthly utilities",
    category: "Utilities",
    icon: <ZapIcon className="h-4 w-4" />,
  },
];

export const QuickTemplates: React.FC<QuickTemplatesProps> = ({
  onSelectTemplate,
  selectedTemplate,
  className,
}) => {
  return (
    <div className={cn("space-y-2 overflow-x-hidden max-w-full", className)}>
      <label className="text-sm font-medium text-muted-foreground">Quick templates</label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelectTemplate({
              description: template.description,
              category: template.category,
              amount: template.amount,
            })}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap transition-all",
              "hover:bg-accent hover:border-accent-foreground/20",
              selectedTemplate === template.description
                ? "bg-primary/10 border-primary text-primary"
                : "bg-background border-border"
            )}
          >
            <span className={cn(
              "p-1 rounded",
              selectedTemplate === template.description
                ? "bg-primary/20"
                : "bg-muted"
            )}>
              {template.icon}
            </span>
            <span className="text-sm font-medium">{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
