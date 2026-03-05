import { useHaptics } from "@/hooks/use-haptics";
import { Button } from '@/components/ui/button';
import { CheckCircle2Icon, ArrowRightIcon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';

interface SettlementButtonProps {
  amount: number;
  currency: string;
  recipientName: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline';
}

export function SettlementButton({
  amount,
  currency,
  recipientName,
  onClick,
  disabled = false,
  variant = 'default',
}: SettlementButtonProps) {
  const { success } = useHaptics();
  return (
    <Button
      onClick={() => { success(); onClick(); }}
      disabled={disabled}
      variant={variant}
      className="w-full h-12 text-base font-semibold"
    >
      <CheckCircle2Icon className="h-5 w-5 mr-2" />
      Pay {recipientName} {formatNumber(amount)} {currency}
      <ArrowRightIcon className="h-5 w-5 ml-2" />
    </Button>
  );
}
