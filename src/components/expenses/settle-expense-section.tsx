import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { BanknoteIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SPRING_GENTLE, ENTRANCE_Y } from "@/lib/animation";

interface SettleExpenseSectionProps {
  payerName: string;
  amountOwed: number;
  currency: string;
  isSettled: boolean;
  onSettle: () => void;
  isSettling: boolean;
}

export function SettleExpenseSection({
  payerName,
  amountOwed,
  currency,
  isSettled,
  onSettle,
  isSettling,
}: SettleExpenseSectionProps) {
  const { t } = useTranslation();
  const { success } = useHaptics();
  const reduced = useReducedMotion();

  const entranceProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: ENTRANCE_Y },
        animate: { opacity: 1, y: 0 },
        transition: SPRING_GENTLE,
      };

  const hoverProps = reduced ? {} : { whileHover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" } };

  if (isSettled) {
    return (
      <motion.div {...entranceProps} {...hoverProps}>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="flex items-center justify-center gap-2 py-6">
            <CheckCircle2Icon className="h-5 w-5 text-success" />
            <span className="typography-body text-success font-medium">{t('expense.alreadySettled', 'Already settled')}</span>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (amountOwed <= 0) {
    return null; // User doesn't owe anything
  }

  return (
    <motion.div {...entranceProps} {...hoverProps}>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 typography-card-title">
            <BanknoteIcon className="h-5 w-5" />
            {t('expense.settleYourShare', 'Settle Your Share')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="typography-body text-muted-foreground">
            {t('expense.youOweStatement', 'You owe {{name}} {{amount}} for this expense', {
              name: payerName,
              amount: formatCurrency(amountOwed, currency)
            })}
          </p>
          <Button
            onClick={() => { success(); onSettle(); }}
            disabled={isSettling}
            className="w-full"
            size="lg"
          >
            {isSettling ? t('expense.settling', 'Settling...') : t('expense.markAsPaid', 'Mark as Paid')}
          </Button>
          <p className="typography-metadata text-center">
            {t('expense.manualSettlementNote', 'Settlements are marked manually. Actual payment is your responsibility.')}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
