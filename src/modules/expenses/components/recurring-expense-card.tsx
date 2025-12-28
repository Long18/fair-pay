import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  RecurringExpense,
  getFrequencyDescription,
  getRecurringExpenseStatus,
} from '../types/recurring';
import { CategoryIcon } from './category-icon';
import { useState } from 'react';
import { useUpdateRecurringExpense, useDeleteRecurringExpense } from '../hooks/use-recurring-expenses';
import { useNotification } from '@refinedev/core';
import { formatNumber } from '@/lib/locale-utils';

import { MoreVerticalIcon, RepeatIcon, PauseIcon, PlayIcon, Trash2Icon, CalendarIcon } from "@/components/ui/icons";
interface RecurringExpenseCardProps {
  recurring: RecurringExpense;
  onUpdate?: () => void;
}

export function RecurringExpenseCard({ recurring, onUpdate }: RecurringExpenseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { pauseRecurring, resumeRecurring } = useUpdateRecurringExpense();
  const { deleteRecurring } = useDeleteRecurringExpense();
  const { open: notify } = useNotification();

  const status = getRecurringExpenseStatus(recurring);
  const template = recurring.template_expense;

  const handlePauseResume = async () => {
    try {
      setIsUpdating(true);
      if (recurring.is_active) {
        await pauseRecurring(recurring.id);
        notify?.({
          type: 'success',
          message: 'Đã tạm dừng chi phí định kỳ',
        });
      } else {
        await resumeRecurring(recurring.id);
        notify?.({
          type: 'success',
          message: 'Đã tiếp tục chi phí định kỳ',
        });
      }
      onUpdate?.();
    } catch (error) {
      notify?.({
        type: 'error',
        message: 'Có lỗi xảy ra',
        description: error instanceof Error ? error.message : 'Không thể cập nhật',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteRecurring(recurring.id);
      notify?.({
        type: 'success',
        message: 'Đã xóa chi phí định kỳ',
      });
      setShowDeleteDialog(false);
      onUpdate?.();
    } catch (error) {
      notify?.({
        type: 'error',
        message: 'Có lỗi xảy ra',
        description: error instanceof Error ? error.message : 'Không thể xóa',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!template) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RepeatIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{template.description}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {template.category && (
                    <CategoryIcon category={template.category} size="sm" />
                  )}
                  <Badge variant={recurring.is_active ? 'default' : 'secondary'}>
                    {recurring.is_active ? 'Đang hoạt động' : 'Đã tạm dừng'}
                  </Badge>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handlePauseResume}
                  disabled={isUpdating}
                >
                  {recurring.is_active ? (
                    <>
                      <PauseIcon className="mr-2 h-4 w-4" />
                      Tạm dừng
                    </>
                  ) : (
                    <>
                      <PlayIcon className="mr-2 h-4 w-4" />
                      Tiếp tục
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatNumber(template.amount)} {template.currency}
            </span>
            <Badge variant="outline">
              {getFrequencyDescription(recurring.frequency, recurring.interval)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Lần tạo tiếp theo</p>
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <p className="font-medium">
                  {format(new Date(recurring.next_occurrence), 'PPP', { locale: vi })}
                </p>
              </div>
              {status.days_until_next >= 0 && (
                <p className="text-xs text-muted-foreground">
                  (Còn {status.days_until_next} ngày)
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground">
                {recurring.end_date ? 'Kết thúc vào' : 'Không giới hạn'}
              </p>
              {recurring.end_date && (
                <p className="font-medium">
                  {format(new Date(recurring.end_date), 'PPP', { locale: vi })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chi phí định kỳ?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Chi phí định kỳ sẽ bị xóa vĩnh viễn.
              <br />
              <br />
              <strong>Lưu ý:</strong> Các chi phí đã được tạo trước đó sẽ không bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
