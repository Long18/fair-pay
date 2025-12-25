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
    <Card className="border-[#F2F2F2]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-[#828282]">
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
              stroke="#828282"
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
            <CartesianGrid strokeDasharray="0" stroke="#F2F2F2" vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#969696", fontSize: 14, fontFamily: "Montserrat" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#969696", fontSize: 14, fontFamily: "Montserrat" }}
              tickFormatter={(value) => `${value.toLocaleString()}`}
              ticks={[0, 50000, 100000, 150000, 200000]}
            />
            <Bar
              dataKey="amount"
              fill="#ECCCFF"
              radius={[15, 15, 0, 0]}
              barSize={79}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
