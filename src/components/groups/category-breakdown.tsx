import { getCategoryMeta } from '@/modules/expenses';
import { formatNumber } from '@/lib/locale-utils';
import { cn } from '@/lib/utils';
import { PieChartIcon } from '@/components/ui/icons';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/ui/use-reduced-motion';
import { SPRING_GENTLE, ENTRANCE_Y, STAGGER_DELAY } from '@/lib/animation';

interface CategoryBreakdownItem {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface CategoryBreakdownProps {
  breakdown: CategoryBreakdownItem[];
  totalAmount: number;
  currency?: string;
}

export function CategoryBreakdown({
  breakdown,
  totalAmount,
  currency = '₫',
}: CategoryBreakdownProps) {
  const reducedMotion = useReducedMotion();

  if (breakdown.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <PieChartIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {breakdown.map((item, index) => {
        const categoryMeta = getCategoryMeta(item.category);
        const Icon = categoryMeta.icon;

        return (
          <motion.div
            key={item.category}
            initial={reducedMotion ? false : { opacity: 0, y: ENTRANCE_Y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_GENTLE, delay: index * STAGGER_DELAY }}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', categoryMeta.bgColor)}>
                <Icon className={cn('h-4 w-4', categoryMeta.color)} />
              </div>
              <div>
                <p className="font-medium text-sm">{item.category}</p>
                <p className="text-xs text-muted-foreground">
                  {item.count} expense(s)
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {formatNumber(item.amount)} {currency}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}%
              </p>
            </div>
          </motion.div>
        );
      })}

      {/* Total */}
      <div className="pt-2 border-t flex justify-between items-center">
        <span className="text-sm font-medium">Total:</span>
        <span className="text-lg font-bold">{formatNumber(totalAmount)} {currency}</span>
      </div>
    </div>
  );
}
