import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, MoreVertical } from "lucide-react";

interface CreditorCardProps {
  name: string;
  logo?: string;
  description: string;
  instalmentsLeft: number;
  amountPaid: number;
  amountDue: number;
  hasIssue?: boolean;
  currency?: string;
  onMenuClick?: () => void;
}

export const CreditorCard = ({
  name,
  logo,
  description,
  instalmentsLeft,
  amountPaid,
  amountDue,
  hasIssue = false,
  currency: _currency = "VND",
  onMenuClick,
}: CreditorCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={name} className="h-10 w-10 object-contain" />
            ) : (
              <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-gray-600">{name.charAt(0)}</span>
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-gray-900">{name}</h3>
              <p className="text-xs text-gray-600">{description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-8 w-8 text-gray-500 hover:text-gray-700"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {hasIssue && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-red-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Payment issue</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#FEF3C7"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#F59E0B"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(instalmentsLeft / 20) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-lg font-bold text-gray-900">{instalmentsLeft}</span>
            </div>
            <p className="text-xs text-gray-600">Instalments Left</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#D1FAE5"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#10B981"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray="176 176"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-green-600">₫{formatCurrency(amountPaid)}</span>
            </div>
            <p className="text-xs text-gray-600">Paid</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#FEE2E2"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#EF4444"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(amountDue / (amountPaid + amountDue)) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-red-600">₫{formatCurrency(amountDue)}</span>
            </div>
            <p className="text-xs text-gray-600">Due</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
