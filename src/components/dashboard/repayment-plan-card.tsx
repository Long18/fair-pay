import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCw } from "lucide-react";

interface RepaymentPlanCardProps {
  nextDate: string;
  instalmentsLeft: number;
  instalmentAmount: number;
  paymentType: string;
  currency?: string;
  onActivate?: () => void;
  onChange?: () => void;
}

export const RepaymentPlanCard = ({
  nextDate,
  instalmentsLeft,
  instalmentAmount,
  paymentType,
  currency = "VND",
  onActivate,
  onChange,
}: RepaymentPlanCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600">Repayment Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-full">
            <RefreshCw className="h-6 w-6 text-gray-700" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-gray-900">Next Installment on {nextDate}</p>
            <p className="text-sm text-gray-600">Only {instalmentsLeft} installments left !</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">₫{formatCurrency(instalmentAmount)}</div>
            <div className="text-sm text-gray-600 mt-1">Installment</div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">{paymentType}</div>
              <div className="text-xs text-gray-500">Payment type</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {onActivate && (
            <Button
              onClick={onActivate}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              ACTIVATE
            </Button>
          )}
          {onChange && (
            <Button
              onClick={onChange}
              variant="outline"
              className="flex-1 border-green-500 text-green-600 hover:bg-green-50 font-medium"
            >
              CHANGE
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
