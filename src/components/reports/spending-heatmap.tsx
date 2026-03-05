import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/locale-utils";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from "date-fns";
import { useMemo } from "react";
import { useHaptics } from '@/hooks/use-haptics';

interface HeatmapData {
  date: string;
  amount: number;
  count: number;
}

interface SpendingHeatmapProps {
  data: HeatmapData[];
  month: Date;
  title?: string;
  onDayClick?: (date: string) => void;
}

export function SpendingHeatmap({
  data,
  month,
  title = "Daily Spending Heatmap",
  onDayClick,
}: SpendingHeatmapProps) {
  const { tap } = useHaptics();
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
  }, [month]);

  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapData>();
    data.forEach((item) => {
      map.set(item.date, item);
    });
    return map;
  }, [data]);

  const maxAmount = useMemo(() => {
    return Math.max(...data.map((d) => d.amount), 1);
  }, [data]);

  const getIntensity = (amount: number) => {
    if (amount === 0) return 0;
    const intensity = Math.ceil((amount / maxAmount) * 4);
    return Math.min(intensity, 4);
  };

  const getColorClass = (intensity: number) => {
    switch (intensity) {
      case 0:
        return "bg-muted";
      case 1:
        return "bg-primary/20";
      case 2:
        return "bg-primary/40";
      case 3:
        return "bg-primary/60";
      case 4:
        return "bg-primary/80";
      default:
        return "bg-muted";
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    const firstDayOfWeek = getDay(daysInMonth[0]);
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null as any);
    }

    daysInMonth.forEach((day) => {
      currentWeek.push(day);
      if (getDay(day) === 6) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null as any);
      }
      result.push(currentWeek);
    }

    return result;
  }, [daysInMonth]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(month, "MMMM yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-2">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return <div key={dayIndex} className="aspect-square" />;
                  }

                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayData = dataMap.get(dateStr);
                  const amount = dayData?.amount || 0;
                  const count = dayData?.count || 0;
                  const intensity = getIntensity(amount);

                  return (
                    <button
                      key={dayIndex}
                      onClick={() => { tap(); onDayClick?.(dateStr); }}
                      className={`aspect-square rounded-md ${getColorClass(
                        intensity
                      )} hover:ring-2 hover:ring-primary transition-all relative group`}
                      title={`${format(day, "MMM d")}: ${formatNumber(amount)} ₫ (${count} expenses)`}
                    >
                      <span className="text-xs font-medium">{format(day, "d")}</span>

                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-background border rounded-lg p-2 shadow-lg whitespace-nowrap">
                          <p className="text-xs font-medium">{format(day, "MMM d, yyyy")}</p>
                          <p className="text-xs text-primary">{formatNumber(amount)} ₫</p>
                          <p className="text-xs text-muted-foreground">{count} expenses</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">Less</span>
            {[0, 1, 2, 3, 4].map((intensity) => (
              <div
                key={intensity}
                className={`w-4 h-4 rounded ${getColorClass(intensity)}`}
              />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
