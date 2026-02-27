import { DataCard } from "@/components/ui/data-card";
import { CircularProgress } from "./balance/circular-progress";

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
    <DataCard className="border-border">
      <DataCard.Header title="Statistics" />
      <DataCard.Content className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <CircularProgress percentage={percentage} color="var(--chart-positive, oklch(0.65 0.17 155))" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{instalmentsLeft}</div>
            <div className="text-sm text-muted-foreground mt-1">Instalments Left</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive">₫{formatCurrency(amountDue)}</div>
            <div className="text-sm text-muted-foreground mt-1">Amount Due</div>
          </div>
        </div>
      </DataCard.Content>
    </DataCard>
  );
};
