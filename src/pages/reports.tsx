import { useState } from 'react';
import { useList } from '@refinedev/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange as DateRangeType, DateRangePreset, useSpendingSummary } from '@/hooks/use-spending-summary';
import { useCategoryBreakdown } from '@/hooks/use-category-breakdown';
import { useSpendingTrend } from '@/hooks/use-spending-trend';
import { CategoryPieChart, SpendingTrendChart, SpendingSummaryStats } from '@/components/reports';
import { Group } from '@/modules/groups/types';
import { DateRange } from 'react-day-picker';

import { DownloadIcon, Loader2Icon } from "@/components/ui/icons";
export function ReportsPage() {
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [customRange, setCustomRange] = useState<DateRange>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const { query: groupsQuery } = useList<Group>({
    resource: 'groups',
    pagination: { mode: 'off' },
    meta: {
      select: 'id, name',
    },
  });

  const groups = groupsQuery.data?.data || [];

  const dateRange: DateRangeType | undefined = customRange?.from && customRange?.to
    ? { start: customRange.from, end: customRange.to }
    : undefined;

  const { summary, isLoading: summaryLoading } = useSpendingSummary(
    preset,
    dateRange,
    selectedGroupId
  );

  const { breakdown, isLoading: breakdownLoading } = useCategoryBreakdown(
    preset,
    dateRange,
    selectedGroupId
  );

  const { trend, isLoading: trendLoading } = useSpendingTrend(
    preset,
    dateRange,
    selectedGroupId
  );

  const handlePresetChange = (value: string) => {
    setPreset(value as DateRangePreset);
    if (value !== 'custom') {
      setCustomRange(undefined);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['Danh mục', 'Số tiền', 'Số lượng', 'Phần trăm'],
      ...breakdown.map(item => [
        item.category,
        item.amount.toString(),
        item.count.toString(),
        item.percentage.toFixed(2) + '%'
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `bao-cao-chi-tieu-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = summaryLoading || breakdownLoading || trendLoading;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Báo cáo chi tiêu</h1>
          <p className="text-muted-foreground">
            Phân tích chi tiêu và xu hướng của bạn
          </p>
        </div>

        <Button onClick={handleExportCSV} variant="outline" disabled={isLoading || breakdown.length === 0}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          Xuất CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Date Range Preset */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Khoảng thời gian</label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Tháng này</SelectItem>
                  <SelectItem value="last_month">Tháng trước</SelectItem>
                  <SelectItem value="this_year">Năm nay</SelectItem>
                  <SelectItem value="last_year">Năm trước</SelectItem>
                  <SelectItem value="all_time">Tất cả</SelectItem>
                  <SelectItem value="custom">Tùy chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {preset === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Chọn khoảng</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customRange?.from ? (
                        customRange.to ? (
                          <>
                            {format(customRange.from, 'dd MMM yyyy', { locale: vi })} -{' '}
                            {format(customRange.to, 'dd MMM yyyy', { locale: vi })}
                          </>
                        ) : (
                          format(customRange.from, 'dd MMM yyyy', { locale: vi })
                        )
                      ) : (
                        <span>Chọn ngày</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customRange?.from}
                      selected={customRange}
                      onSelect={setCustomRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Group Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nhóm</label>
              <Select value={selectedGroupId || 'all'} onValueChange={(value) => setSelectedGroupId(value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nhóm</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && (
        <>
          <SpendingSummaryStats summary={summary} />

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryPieChart data={breakdown} />
            <SpendingTrendChart data={trend} />
          </div>
        </>
      )}
    </div>
  );
}
