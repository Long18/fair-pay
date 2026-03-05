import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHaptics } from '@/hooks/use-haptics';

interface PaymentCounterProps {
  count: number;
  onShowAll?: () => void;
}

export const PaymentCounter = ({ count, onShowAll }: PaymentCounterProps) => {
  const { tap } = useHaptics();
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-red-500">▶</span>
          Number of payments to proceed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="relative">
          <div className="text-7xl font-bold text-red-400">{count}</div>
          <div className="absolute -bottom-2 right-0 w-3 h-3 bg-red-400 rounded-full" />
        </div>
        {onShowAll && (
          <Button
            variant="link"
            onClick={() => { tap(); onShowAll?.(); }}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900"
          >
            Show all
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
