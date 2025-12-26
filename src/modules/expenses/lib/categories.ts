import {
  UtensilsCrossed,
  Car,
  Home,
  Tv,
  ShoppingBag,
  Zap,
  Heart,
  GraduationCap,
  MoreHorizontal,
  LucideIcon
} from "lucide-react";

export interface CategoryMeta {
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
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
    icon: UtensilsCrossed,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  'Transportation': {
    name: 'Transportation',
    icon: Car,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  'Accommodation': {
    name: 'Accommodation',
    icon: Home,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  'Entertainment': {
    name: 'Entertainment',
    icon: Tv,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  'Shopping': {
    name: 'Shopping',
    icon: ShoppingBag,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  'Utilities': {
    name: 'Utilities',
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  'Healthcare': {
    name: 'Healthcare',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  'Education': {
    name: 'Education',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  'Other': {
    name: 'Other',
    icon: MoreHorizontal,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

export const getCategoryMeta = (category: string | null | undefined): CategoryMeta => {
  if (!category) {
    return CATEGORY_CONFIG['Other'];
  }

  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other'];
};

export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_CONFIG);
