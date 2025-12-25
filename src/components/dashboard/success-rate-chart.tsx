import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SuccessRateChartProps {
  successful?: number;
  unsuccessful?: number;
}

export const SuccessRateChart = ({
  successful = 150,
  unsuccessful = 1,
}: SuccessRateChartProps) => {
  const total = successful + unsuccessful;
  const successRate = Math.round((successful / total) * 100);

  const data = [
    { name: "Successful", value: successful },
    { name: "Unsuccessful", value: unsuccessful },
  ];

  const COLORS = ["#A6D997", "#DFEEDB"];

  return (
    <Card className="border-[#F2F2F2]">
      <CardHeader>
        <CardTitle className="text-base font-bold text-[#333]">
          Success rate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative flex items-center justify-center">
          <ResponsiveContainer width={150} height={150}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={75}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-[#89B27C]">
              {successRate}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-[22px] h-[22px] rounded-lg bg-[#DFEEDB]" />
              <span className="text-xs font-semibold text-[#828282]">
                Unsuccessful
              </span>
            </div>
            <div className="text-[32px] font-semibold text-[#333] leading-none ml-7">
              {unsuccessful}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-[22px] h-[22px] rounded-lg bg-[#A6D997]" />
              <span className="text-xs font-semibold text-[#828282]">
                Successful
              </span>
            </div>
            <div className="text-[32px] font-semibold text-[#333] leading-none ml-7">
              {successful}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
