import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface WeeklyEarningsChartProps {
  data?: Array<{
    week: string;
    amount: number;
  }>;
}

export const WeeklyEarningsChart = ({ data }: WeeklyEarningsChartProps) => {
  const defaultData = [
    { week: "Mar 1 - 7", amount: 50000 },
    { week: "Mar 8 - 14", amount: 100000 },
    { week: "Mar 15 - 21", amount: 100000 },
    { week: "Mar 22 - 28", amount: 100000 },
    { week: "Final wk", amount: 150000 },
  ];

  const chartData = data || defaultData;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-muted-foreground">
          Last 30 days
        </CardTitle>
        <button className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 5L15 10L10 15"
              stroke="currentColor"
              className="text-muted-foreground"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="var(--chart-grid, oklch(0.95 0 0))" vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "var(--chart-axis, oklch(0.65 0 0))",
                fontSize: "var(--font-size-chart-lg)",
                fontFamily: "var(--font-sans)",
              }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "var(--chart-axis, oklch(0.65 0 0))",
                fontSize: "var(--font-size-chart-lg)",
                fontFamily: "var(--font-sans)",
              }}
              tickFormatter={(value) => `${value.toLocaleString()}`}
              ticks={[0, 50000, 100000, 150000, 200000]}
            />
            <Bar
              dataKey="amount"
              fill="var(--chart-2, oklch(0.678 0.376 213.1))"
              radius={[15, 15, 0, 0]}
              barSize={79}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
