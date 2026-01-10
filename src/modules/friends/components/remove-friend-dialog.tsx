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
import { AlertTriangleIcon } from "@/components/ui/icons";
import { useTranslation } from "react-i18next";

interface RemoveFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendName: string;
  hasUnpaidExpenses?: boolean;
  onConfirm: () => void;
  isRemoving?: boolean;
}

export const RemoveFriendDialog = ({
  open,
  onOpenChange,
  friendName,
  hasUnpaidExpenses = false,
  onConfirm,
  isRemoving = false,
}: RemoveFriendDialogProps) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            {t('friends.removeFriend', 'Remove Friend')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              {t(
                'friends.removeConfirmation',
                `Are you sure you want to remove ${friendName} from your friends?`
              )}
            </p>
            
            {hasUnpaidExpenses && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangleIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">
                    {t('friends.unpaidExpensesWarning', 'Warning: Unpaid Expenses')}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {t(
                      'friends.unpaidExpensesDescription',
                      'This friend has unpaid expenses. Removing them will not delete the expenses, but you may lose easy access to settle up.'
                    )}
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {t(
                'friends.removeImpact',
                'Shared expenses and payment history will remain visible, but you will no longer see this person in your friends list.'
              )}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving
              ? t('common.removing', 'Removing...')
              : t('friends.remove', 'Remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
