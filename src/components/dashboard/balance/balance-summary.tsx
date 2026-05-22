import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "@/components/ui/icons";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SPRING_GENTLE, ENTRANCE_Y, STAGGER_DELAY } from "@/lib/animation";

interface BalanceSummaryProps {
  totalOwed: number;
  totalOwedToMe: number;
  netBalance: number;
}

export const BalanceSummary = ({
  totalOwed,
  totalOwedToMe,
  netBalance,
}: BalanceSummaryProps) => {
  const reducedMotion = useReducedMotion();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const cards = [
    {
      icon: <TrendingDownIcon className="h-4 w-4 text-destructive" />,
      label: "You Owe",
      value: <div className="text-3xl font-bold text-destructive">₫{formatCurrency(totalOwed)}</div>,
      meta: "Total debt to others",
    },
    {
      icon: <TrendingUpIcon className="h-4 w-4 text-green-500" />,
      label: "Owed to You",
      value: <div className="text-3xl font-bold text-green-600">₫{formatCurrency(totalOwedToMe)}</div>,
      meta: "Total credit from others",
    },
    {
      icon: <MinusIcon className="h-4 w-4 text-muted-foreground" />,
      label: "Net Balance",
      value: (
        <div className={`text-3xl font-bold ${
          netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {netBalance > 0 ? '+' : ''}₫{formatCurrency(netBalance)}
        </div>
      ),
      meta: netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'All settled',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={reducedMotion ? false : { opacity: 0, y: ENTRANCE_Y }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { ...SPRING_GENTLE, delay: i * STAGGER_DELAY }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {card.icon}
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {card.value}
              <p className="text-xs text-muted-foreground mt-2">{card.meta}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
