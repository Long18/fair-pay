import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  type: 'expense' | 'payment';
  created_by_name: string;
  created_by_avatar_url?: string | null;
  group_name?: string | null;
}

interface ActivityTableProps {
  activities: Activity[];
  metadata?: PaginationMetadata;
  onPageChange?: (page: number) => void;
  disabled?: boolean;
}

export function ActivityTable({
  activities,
  metadata,
  onPageChange,
  disabled = false
}: ActivityTableProps) {
  const go = useGo();
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('common.today', 'Today');
    if (diffDays === 1) return t('common.yesterday', 'Yesterday');
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {t('dashboard.noRecentActivity', 'No recent activity')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('expenses.description', 'Description')}</TableHead>
            <TableHead>{t('groups.title', 'Group')}</TableHead>
            <TableHead>{t('expenses.date', 'Date')}</TableHead>
            <TableHead className="text-right">{t('expenses.amount', 'Amount')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity, index) => (
            <TableRow
              key={activity.id}
              className={cn(
                "cursor-pointer",
                index % 2 === 0 && "bg-muted/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => {
                if (disabled) return;
                const path = activity.type === "expense"
                  ? `/expenses/show/${activity.id}`
                  : `/payments/show/${activity.id}`;
                go({ to: path });
              }}
            >
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.created_by_avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {activity.created_by_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{activity.description}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {activity.group_name || t('dashboard.personal', 'Personal')}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(activity.date)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                ₫{formatCurrency(Number(activity.amount))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {metadata && onPageChange && (
        <PaginationControls
          metadata={metadata}
          onPageChange={onPageChange}
          showFirstLast={true}
          maxVisiblePages={5}
        />
      )}
    </div>
  );
}
