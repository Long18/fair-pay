import { DataCard } from "@/components/ui/data-card";
import { CircularProgress } from "./circular-progress";

interface StatisticsCardProps {
  percentage: number;
  title: string;
  subtitle: string;
  instalmentsLeft: number;
  amountDue: number;
  currency?: string;
}

export const StatisticsCard = ({
  percentage,
  title,
  subtitle,
  instalmentsLeft,
  amountDue,
  currency: _currency = "VND",
}: StatisticsCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <DataCard className="border-gray-200">
      <DataCard.Header title="Statistics" />
      <DataCard.Content className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <CircularProgress percentage={percentage} color="#4CAF50" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{instalmentsLeft}</div>
            <div className="text-sm text-gray-600 mt-1">Instalments Left</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">₫{formatCurrency(amountDue)}</div>
            <div className="text-sm text-gray-600 mt-1">Amount Due</div>
          </div>
        </div>
      </DataCard.Content>
    </DataCard>
  );
};
