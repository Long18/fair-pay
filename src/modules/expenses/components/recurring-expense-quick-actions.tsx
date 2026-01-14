import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  CreditCardIcon,
} from "@/components/ui/icons";
import { RecurringExpense } from "../types/recurring";
import { useRecurringActions } from "../hooks/use-recurring-actions";

interface RecurringQuickActionsProps {
  expense: RecurringExpense;
  onEdit?: () => void;
  onPrepay?: () => void;
}

export function RecurringQuickActions({
  expense,
  onEdit,
  onPrepay,
}: RecurringQuickActionsProps) {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { pause, resume, skip, remove } = useRecurringActions();

  const handlePauseResume = () => {
    if (expense.is_active) {
      pause(expense.id);
    } else {
      resume(expense.id);
    }
  };

  const handleSkip = () => {
    skip(expense);
  };

  const handleDelete = () => {
    remove(expense.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">
              {t('recurring.actions.menu', 'Open menu')}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePauseResume}>
            {expense.is_active ? (
              <>
                <PauseIcon className="h-4 w-4 mr-2" />
                {t('recurring.actions.pause', 'Pause')}
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                {t('recurring.actions.resume', 'Resume')}
              </>
            )}
          </DropdownMenuItem>

          {expense.is_active && (
            <DropdownMenuItem onClick={handleSkip}>
              <ArrowRightIcon className="h-4 w-4 mr-2" />
              {t('recurring.actions.skip', 'Skip Next')}
            </DropdownMenuItem>
          )}

          {onPrepay && (
            <DropdownMenuItem onClick={onPrepay}>
              <CreditCardIcon className="h-4 w-4 mr-2" />
              {t('recurring.actions.prepay', 'Record Prepayment')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon className="h-4 w-4 mr-2" />
              {t('recurring.actions.edit', 'Edit Template')}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {t('recurring.actions.delete', 'Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('recurring.delete.title', 'Delete Recurring Expense?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'recurring.delete.description',
                'This will permanently delete this recurring expense template. Future expenses will not be created automatically.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
