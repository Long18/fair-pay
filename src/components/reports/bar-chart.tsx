import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatNumber } from "@/lib/locale-utils";

interface BarChartData {
  label: string;
  value: number;
  comparisonValue?: number;
  fill?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  showComparison?: boolean;
  horizontal?: boolean;
}

export function BarChart({
  data,
  title = "Bar Chart",
  showComparison = false,
  horizontal = false,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.label}</p>
          <p className="text-sm text-primary">
            Current: {formatNumber(data.value)} ₫
          </p>
          {showComparison && data.comparisonValue !== undefined && (
            <p className="text-sm text-muted-foreground">
              Previous: {formatNumber(data.comparisonValue)} ₫
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const ChartComponent = horizontal ? RechartsBarChart : RechartsBarChart;
  const layout = horizontal ? "horizontal" : "vertical";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ChartComponent
            data={data}
            layout={layout}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  width={100}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              name="Current"
              radius={[4, 4, 0, 0]}
            />
            {showComparison && (
              <Bar
                dataKey="comparisonValue"
                fill="hsl(var(--muted-foreground))"
                name="Previous"
                radius={[4, 4, 0, 0]}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

