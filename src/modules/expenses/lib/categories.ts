import { CarIcon, HomeIcon, ZapIcon, HeartIcon, MoreHorizontalIcon, UtensilsIcon, MonitorIcon, ShoppingCartIcon, BriefcaseIcon } from "@/components/ui/icons";
import type { IconProps } from "@/components/ui/icons";
import { themeIntentTones, type ThemeIntent } from "@/lib/theme-intents";
import React from "react";

export interface CategoryMeta {
  name: string;
  icon: React.FC<IconProps>;
  color: string;
  bgColor: string;
  tone: ThemeIntent;
  chartColor: string;
}

/**
 * Expense Categories Configuration
 *
 * IMPORTANT: These categories are synchronized with the database enum type.
 * Database: expense_category enum in supabase/migrations/007_expense_categories_constraint.sql
 *
 * To add a new category:
 * 1. Add it to the database enum via migration
 * 2. Add it to this CATEGORY_CONFIG object
 * 3. Update the expense_category enum in the database
 *
 * @see supabase/migrations/007_expense_categories_constraint.sql
 */
export const CATEGORY_CONFIG: Record<string, CategoryMeta> = {
  'Food & Drink': {
    name: 'Food & Drink',
    icon: UtensilsIcon,
    color: themeIntentTones.accent.icon,
    bgColor: themeIntentTones.accent.surface,
    tone: 'accent',
    chartColor: themeIntentTones.accent.chartColor,
  },
  'Transportation': {
    name: 'Transportation',
    icon: CarIcon,
    color: themeIntentTones.brand.icon,
    bgColor: themeIntentTones.brand.surface,
    tone: 'brand',
    chartColor: themeIntentTones.brand.chartColor,
  },
  'Accommodation': {
    name: 'Accommodation',
    icon: HomeIcon,
    color: themeIntentTones.chart2.icon,
    bgColor: themeIntentTones.chart2.surface,
    tone: 'chart2',
    chartColor: themeIntentTones.chart2.chartColor,
  },
  'Entertainment': {
    name: 'Entertainment',
    icon: MonitorIcon,
    color: themeIntentTones.chart5.icon,
    bgColor: themeIntentTones.chart5.surface,
    tone: 'chart5',
    chartColor: themeIntentTones.chart5.chartColor,
  },
  'Shopping': {
    name: 'Shopping',
    icon: ShoppingCartIcon,
    color: themeIntentTones.success.icon,
    bgColor: themeIntentTones.success.surface,
    tone: 'success',
    chartColor: themeIntentTones.success.chartColor,
  },
  'Utilities': {
    name: 'Utilities',
    icon: ZapIcon,
    color: themeIntentTones.warning.icon,
    bgColor: themeIntentTones.warning.surface,
    tone: 'warning',
    chartColor: themeIntentTones.warning.chartColor,
  },
  'Healthcare': {
    name: 'Healthcare',
    icon: HeartIcon,
    color: themeIntentTones.danger.icon,
    bgColor: themeIntentTones.danger.surface,
    tone: 'danger',
    chartColor: themeIntentTones.danger.chartColor,
  },
  'Education': {
    name: 'Education',
    icon: BriefcaseIcon,
    color: themeIntentTones.info.icon,
    bgColor: themeIntentTones.info.surface,
    tone: 'info',
    chartColor: themeIntentTones.info.chartColor,
  },
  'Other': {
    name: 'Other',
    icon: MoreHorizontalIcon,
    color: themeIntentTones.neutral.icon,
    bgColor: themeIntentTones.neutral.surface,
    tone: 'neutral',
    chartColor: themeIntentTones.neutral.chartColor,
  },
};

export const getCategoryMeta = (category: string | null | undefined): CategoryMeta => {
  if (!category) {
    return CATEGORY_CONFIG['Other'];
  }

  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other'];
};

export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_CONFIG);
