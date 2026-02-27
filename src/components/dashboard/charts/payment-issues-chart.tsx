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
    { name: "a", value: systemErrors, color: "var(--status-warning, oklch(0.75 0.15 80))" },
    { name: "x", value: customerErrors, color: "var(--status-warning-border, oklch(0.88 0.08 80))" },
    { name: "o", value: fraudBlocks, color: "var(--chart-negative, oklch(0.577 0.245 27.325))" },
    { name: "n", value: bankErrors, color: "var(--status-info, oklch(0.598 0.365 217.2))" },
  ];

  const totalErrors = customerErrors + fraudBlocks + bankErrors + systemErrors;

  const issueTypes = [
    { label: "Customer errors", color: "var(--status-warning-border, oklch(0.88 0.08 80))" },
    { label: "Fraud blocks", color: "var(--chart-negative, oklch(0.577 0.245 27.325))" },
    { label: "Bank errors", color: "var(--status-info, oklch(0.598 0.365 217.2))" },
    { label: "System errors", color: "var(--status-warning, oklch(0.75 0.15 80))" },
  ];

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base font-bold text-foreground">
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
                fill: "var(--chart-axis, oklch(0.65 0 0))",
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
            <span className="text-sm font-semibold text-status-warning">
              Total number of errors:
            </span>
            <span className="text-lg font-bold text-status-warning">
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
              <span className="text-xs font-semibold text-muted-foreground">
                {issue.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
