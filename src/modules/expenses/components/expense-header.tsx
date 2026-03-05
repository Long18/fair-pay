import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { PencilIcon, Trash2Icon, ShareIcon, CopyIcon } from "@/components/ui/icons";
import { CategoryIcon } from "./category-icon";
import { formatDate } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVerticalIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { buildExpenseShareUrl } from "../utils/share-url";

interface ExpenseHeaderProps {
  expense: any;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const ExpenseHeader = ({
  expense,
  canEdit,
  onEdit,
  onDelete,
  className
}: ExpenseHeaderProps) => {
  const { t } = useTranslation();
  const { tap, success, warning } = useHaptics();

  const getShareUrl = () => buildExpenseShareUrl(expense, window.location.href);

  const handleShare = async () => {
    tap();
    const shareUrl = getShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: expense.description,
          text: `Check out this expense: ${expense.description}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback to copying URL
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      success();
      toast.success(t('common.linkCopied', 'Link copied to clipboard'));
    } catch (err) {
      toast.error(t('common.copyFailed', 'Failed to copy link'));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2">
              {expense.category && (
                <CategoryIcon category={expense.category} size="sm" showLabel={false} />
              )}
              <CardTitle className="text-xl flex-1 break-words leading-tight">
                {expense.description}
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(expense.expense_date, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Mobile Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare}>
                <ShareIcon className="h-4 w-4 mr-2" />
                {t('common.share', 'Share')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <CopyIcon className="h-4 w-4 mr-2" />
                {t('common.copyLink', 'Copy Link')}
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { tap(); onEdit(); }}>
                    <PencilIcon className="h-4 w-4 mr-2" />
                    {t('common.edit', 'Edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { warning(); onDelete(); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    {t('common.delete', 'Delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl lg:text-3xl break-words">
                {expense.description}
              </CardTitle>
              {expense.category && (
                <CategoryIcon category={expense.category} size="md" showLabel />
              )}
            </div>
            <p className="text-muted-foreground">
              {formatDate(expense.expense_date, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="hidden lg:flex"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              {t('common.share', 'Share')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="lg:hidden"
            >
              <ShareIcon className="h-4 w-4" />
            </Button>

            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { tap(); onEdit(); }}
                >
                  <PencilIcon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">{t('common.edit', 'Edit')}</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { warning(); onDelete(); }}
                >
                  <Trash2Icon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">{t('common.delete', 'Delete')}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
