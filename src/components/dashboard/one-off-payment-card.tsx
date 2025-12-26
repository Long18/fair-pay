import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

interface OneOffPaymentCardProps {
  discountPercentage: number;
  discountedAmount: number;
  currency?: string;
  onPayNow?: () => void;
}

export const OneOffPaymentCard = ({
  discountPercentage,
  discountedAmount,
  currency = "VND", // eslint-disable-line @typescript-eslint/no-unused-vars
  onPayNow,
}: OneOffPaymentCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          One Off Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-700">
            Pay full amount and get <span className="font-bold text-green-700">{discountPercentage}% discount</span>*
          </p>
          <p className="text-xs text-gray-600 mt-1">but this on is one off payment.</p>
        </div>

        <div className="pt-4">
          <div className="text-4xl font-bold text-gray-900">₫{formatCurrency(discountedAmount)}</div>
          <div className="text-sm text-gray-600 mt-1">Discounted Amount</div>
        </div>

        {onPayNow && (
          <Button
            onClick={onPayNow}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-6 text-base"
          >
            PAY NOW
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
