import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

interface PaymentIssuesChartProps {
  customerErrors?: number;
  fraudBlocks?: number;
  bankErrors?: number;
  systemErrors?: number;
}

export const PaymentIssuesChart = ({
  customerErrors = 5,
  fraudBlocks = 3,
  bankErrors = 10,
  systemErrors = 1,
}: PaymentIssuesChartProps) => {
  const data = [
    { name: "a", value: systemErrors, color: "#FFBB4F" },
    { name: "x", value: customerErrors, color: "#FFDA93" },
    { name: "o", value: fraudBlocks, color: "#FF7576" },
    { name: "n", value: bankErrors, color: "#80E0E5" },
  ];

  const totalErrors = customerErrors + fraudBlocks + bankErrors + systemErrors;

  const issueTypes = [
    { label: "Customer errors", color: "#FFDA93" },
    { label: "Fraud blocks", color: "#FF7576" },
    { label: "Bank errors", color: "#80E0E5" },
    { label: "System errors", color: "#FFBB4F" },
  ];

  return (
    <Card className="border-[#F2F2F2]">
      <CardHeader>
        <CardTitle className="text-base font-bold text-[#333]">
          Payment issues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#BDBDBD",
                fontSize: "var(--font-size-chart-md)",
                fontFamily: "var(--font-sans)",
              }}
              dy={10}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={61}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#FFA14E]">
              Total number of errors:
            </span>
            <span className="text-lg font-bold text-[#FFA14E]">
              {totalErrors}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {issueTypes.map((issue) => (
            <div key={issue.label} className="flex items-center gap-2">
              <div
                className="w-[22px] h-[22px] rounded-full"
                style={{ backgroundColor: issue.color }}
              />
              <span className="text-xs font-semibold text-[#828282]">
                {issue.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
