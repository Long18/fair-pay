import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUpdate, useNotification } from "@refinedev/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RecurringExpense, RecurringFrequency } from "../types/recurring";

interface EditRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: RecurringExpense | null;
}

export function EditRecurringDialog({
  open,
  onOpenChange,
  recurring,
}: EditRecurringDialogProps) {
  const { t } = useTranslation();
  const { open: notify } = useNotification();
  const { mutate: updateRecurring } = useUpdate();

  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [interval, setInterval] = useState(1);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load recurring expense data into form
  useEffect(() => {
    if (recurring && open) {
      setFrequency(recurring.frequency);
      setInterval(recurring.interval);
      setEndDate(recurring.end_date ? new Date(recurring.end_date) : null);
    }
  }, [recurring, open]);

  const handleSave = () => {
    if (!recurring) return;

    setIsSubmitting(true);
    updateRecurring(
      {
        resource: "recurring_expenses",
        id: recurring.id,
        values: {
          frequency,
          interval,
          end_date: endDate ? endDate.toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          notify?.({
            type: "success",
            message: t("recurring.edit.success", "Recurring expense updated successfully"),
          });
          onOpenChange(false);
          setIsSubmitting(false);
        },
        onError: (error) => {
          notify?.({
            type: "error",
            message: t("recurring.edit.error", "Failed to update recurring expense"),
            description: error instanceof Error ? error.message : undefined,
          });
          setIsSubmitting(false);
        },
      }
    );
  };

  if (!recurring) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t("recurring.edit.title", "Edit Recurring Schedule")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "recurring.edit.description",
              "Update how often this expense repeats."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">
              {t("recurring.frequency", "Frequency")}
            </Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("recurring.weekly", "Weekly")}</SelectItem>
                <SelectItem value="bi_weekly">{t("recurring.biweekly", "Bi-weekly")}</SelectItem>
                <SelectItem value="monthly">{t("recurring.monthly", "Monthly")}</SelectItem>
                <SelectItem value="quarterly">{t("recurring.quarterly", "Quarterly")}</SelectItem>
                <SelectItem value="yearly">{t("recurring.yearly", "Yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">
              {t("recurring.interval", "Repeat every")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="interval"
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {frequency === "weekly" && t("recurring.weeks", "weeks")}
                {frequency === "bi_weekly" && t("recurring.biweeks", "bi-weeks")}
                {frequency === "monthly" && t("recurring.months", "months")}
                {frequency === "quarterly" && t("recurring.quarters", "quarters")}
                {frequency === "yearly" && t("recurring.years", "years")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">
              {t("recurring.endDate", "End Date")} ({t("common.optional", "Optional")})
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting
              ? t("common.saving", "Saving...")
              : t("common.save", "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
