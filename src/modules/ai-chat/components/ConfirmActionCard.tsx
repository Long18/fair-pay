import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckIcon, XIcon, AlertCircleIcon } from '@/components/ui/icons';
import type { PendingAction } from '../types';

interface ConfirmActionCardProps {
  action: PendingAction;
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  isLoading: boolean;
}

export const ConfirmActionCard = memo(function ConfirmActionCard({
  action,
  onConfirm,
  onReject,
  isLoading,
}: ConfirmActionCardProps) {
  return (
    <div className="mx-3 my-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3">
      <div className="flex items-start gap-2 mb-2">
        <AlertCircleIcon size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Confirm action: {action.tool_name.replace(/_/g, ' ')}
        </div>
      </div>

      <p className="text-sm text-amber-700 dark:text-amber-400 mb-2 ml-6">
        {action.preview.summary}
      </p>

      {action.preview.fields.length > 0 && (
        <div className="ml-6 mb-3 space-y-1">
          {action.preview.fields.map((field, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="text-muted-foreground min-w-[80px]">{field.label}:</span>
              <span className="font-medium">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {action.preview.impact && (
        <p className="text-xs text-amber-600 dark:text-amber-500 ml-6 mb-3 italic">
          {action.preview.impact}
        </p>
      )}

      <div className="flex gap-2 ml-6">
        <Button
          size="sm"
          onClick={() => onConfirm(action.id)}
          disabled={isLoading}
          className="gap-1"
          aria-label="Confirm action"
        >
          <CheckIcon size={14} />
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(action.id)}
          disabled={isLoading}
          aria-label="Cancel action"
        >
          <XIcon size={14} />
          Cancel
        </Button>
      </div>
    </div>
  );
});
