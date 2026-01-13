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
import { vi, enUS } from 'date-fns/locale';
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
import { useTranslation } from 'react-i18next';

import { MoreVerticalIcon, RepeatIcon, PauseIcon, PlayIcon, Trash2Icon, CalendarIcon } from "@/components/ui/icons";
interface RecurringExpenseCardProps {
  recurring: RecurringExpense;
  onUpdate?: () => void;
}

export function RecurringExpenseCard({ recurring, onUpdate }: RecurringExpenseCardProps) {
  const { t, i18n } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { pauseRecurring, resumeRecurring } = useUpdateRecurringExpense();
  const { deleteRecurring } = useDeleteRecurringExpense();
  const { open: notify } = useNotification();

  const status = getRecurringExpenseStatus(recurring);
  const template = recurring.template_expense;
  const dateLocale = i18n.language === 'vi' ? vi : enUS;

  const handlePauseResume = async () => {
    try {
      setIsUpdating(true);
      if (recurring.is_active) {
        await pauseRecurring(recurring.id);
        notify?.({
          type: 'success',
          message: t('recurring.pausedSuccess'),
        });
      } else {
        await resumeRecurring(recurring.id);
        notify?.({
          type: 'success',
          message: t('recurring.resumedSuccess'),
        });
      }
      onUpdate?.();
    } catch (error) {
      notify?.({
        type: 'error',
        message: t('recurring.errorOccurred'),
        description: error instanceof Error ? error.message : t('recurring.cannotUpdate'),
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
        message: t('recurring.deletedSuccess'),
      });
      setShowDeleteDialog(false);
      onUpdate?.();
    } catch (error) {
      notify?.({
        type: 'error',
        message: t('recurring.errorOccurred'),
        description: error instanceof Error ? error.message : t('recurring.cannotDelete'),
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
                    {recurring.is_active ? t('recurring.active') : t('recurring.paused')}
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
                      {t('recurring.pause')}
                    </>
                  ) : (
                    <>
                      <PlayIcon className="mr-2 h-4 w-4" />
                      {t('recurring.resume')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  {t('recurring.delete')}
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
              <p className="text-muted-foreground">{t('recurring.nextCreation')}</p>
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <p className="font-medium">
                  {format(new Date(recurring.next_occurrence), 'PPP', { locale: dateLocale })}
                </p>
              </div>
              {status.days_until_next >= 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('recurring.daysRemaining', { days: status.days_until_next })}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground">
                {recurring.end_date ? t('recurring.endsOn') : t('recurring.noLimit')}
              </p>
              {recurring.end_date && (
                <p className="font-medium">
                  {format(new Date(recurring.end_date), 'PPP', { locale: dateLocale })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recurring.deleteRecurringTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('recurring.deleteRecurringDescription')}
              <br />
              <br />
              <strong>{t('recurring.deleteRecurringNote')}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t('recurring.deleting') : t('recurring.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
