import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";

import { MoreVerticalIcon } from "@/components/ui/icons";
interface BalanceDataPoint {
  date: string;
  balance: number;
}

interface BalanceChartProps {
  data: BalanceDataPoint[];
  currentBalance: number;
  currency?: string;
}

export const BalanceChart = ({ data, currentBalance, currency = "USD" }: BalanceChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-red-500">▶</span>
          Balance
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVerticalIcon className="h-4 w-4 text-gray-500" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold text-red-400">
              {formatCurrency(currentBalance)} {currency}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {data.length > 0 && `From ${data[0].date} to ${data[data.length - 1].date}`}
            </div>
          </div>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${formatCurrency(value)} ${currency}`, 'Balance']}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#F87171"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
