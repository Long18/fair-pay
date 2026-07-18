import { useReducer, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNotification, useInvalidate } from "@refinedev/core";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "@/components/ui/icons";
import { AmountInput } from "./amount-input";
import { RecurringExpense, RecurringFrequency } from "../types/recurring";
import { useUpdateRecurringExpenseFull } from "../hooks/use-update-recurring-expense-full";
import { useHaptics } from "@/hooks/use-haptics";

interface EditRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: RecurringExpense | null;
  onSuccess?: () => void;
}

interface EditFormState {
  description: string;
  amount: number | undefined;
  frequency: RecurringFrequency;
  repeatInterval: number;
  endDate: string;
}

type EditFormAction =
  | { type: "reset"; payload: EditFormState }
  | { type: "setDescription"; value: string }
  | { type: "setAmount"; value: number | undefined }
  | { type: "setFrequency"; value: RecurringFrequency }
  | { type: "setRepeatInterval"; value: number }
  | { type: "setEndDate"; value: string };

const initialFormState: EditFormState = {
  description: "",
  amount: undefined,
  frequency: "monthly",
  repeatInterval: 1,
  endDate: "",
};

function editFormReducer(state: EditFormState, action: EditFormAction): EditFormState {
  switch (action.type) {
    case "reset":
      return action.payload;
    case "setDescription":
      return { ...state, description: action.value };
    case "setAmount":
      return { ...state, amount: action.value };
    case "setFrequency":
      return { ...state, frequency: action.value };
    case "setRepeatInterval":
      return { ...state, repeatInterval: action.value };
    case "setEndDate":
      return { ...state, endDate: action.value };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function EditRecurringDialog({
  open,
  onOpenChange,
  recurring,
  onSuccess,
}: EditRecurringDialogProps) {
  const { t } = useTranslation();
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const { updateFull, isUpdating } = useUpdateRecurringExpenseFull();
  const { tap, success } = useHaptics();

  const template = recurring?.template_expense || recurring?.expenses;
  const [form, dispatch] = useReducer(editFormReducer, initialFormState);

  useEffect(() => {
    if (recurring && open) {
      const tmpl = recurring.template_expense || recurring.expenses;
      dispatch({
        type: "reset",
        payload: {
          description: tmpl?.description ?? "",
          amount: tmpl?.amount,
          frequency: recurring.frequency,
          repeatInterval: recurring.interval,
          endDate: recurring.end_date ? recurring.end_date.split("T")[0] : "",
        },
      });
    }
  }, [recurring, open]);

  const handleSave = async () => {
    if (!recurring || !template) return;

    const trimmedDescription = form.description.trim();
    if (!trimmedDescription) {
      notify?.({
        type: "error",
        message: t("recurring.editDialog.descriptionRequired", "Description is required"),
      });
      return;
    }

    if (form.amount === undefined || form.amount <= 0) {
      notify?.({
        type: "error",
        message: t("recurring.editDialog.amountRequired", "Amount must be greater than 0"),
      });
      return;
    }

    const hadEndDate = !!recurring.end_date;
    const clearEndDate = hadEndDate && !form.endDate;

    try {
      const result = await updateFull({
        recurringExpenseId: recurring.id,
        amount: form.amount,
        description: trimmedDescription,
        frequency: form.frequency,
        interval: form.repeatInterval,
        endDate: form.endDate || null,
        clearEndDate,
      });

      if (!result.success) {
        notify?.({
          type: "error",
          message: t("recurring.editDialog.error", "Failed to update recurring expense"),
          description: result.error,
        });
        return;
      }

      success();
      await invalidate({
        resource: "recurring_expenses",
        invalidates: ["list", "many", "detail"],
      });
      notify?.({
        type: "success",
        message: t("recurring.editDialog.success", "Recurring expense updated successfully"),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      notify?.({
        type: "error",
        message: t("recurring.editDialog.error", "Failed to update recurring expense"),
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  if (!recurring || !template) return null;

  const currency = template.currency || "VND";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialog.Header
        title={t("recurring.editDialog.title", "Edit Recurring Expense")}
        description={t(
          "recurring.editDialog.description",
          "Update the amount, description, or schedule. Future cycles use the new values; past expenses stay unchanged."
        )}
      />

      <ResponsiveDialog.Content>
        <div className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              {t(
                "recurring.editDialog.futureOnlyNote",
                "Changing the amount updates the template and member shares for upcoming cycles only. Past months stay as they were."
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="recurring-description">
              {t("expenses.description", "Description")}
            </Label>
            <Input
              id="recurring-description"
              value={form.description}
              onChange={(e) => dispatch({ type: "setDescription", value: e.target.value })}
              placeholder={t("expenses.descriptionPlaceholder", "e.g. iCloud subscription")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurring-amount">
              {t("expenses.amount", "Amount")}
            </Label>
            <AmountInput
              value={form.amount}
              onChange={(value) => dispatch({ type: "setAmount", value })}
              currency={currency}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">
              {t("recurring.frequency", "Frequency")}
            </Label>
            <Select
              value={form.frequency}
              onValueChange={(v) => {
                tap();
                dispatch({ type: "setFrequency", value: v as RecurringFrequency });
              }}
            >
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
            <Label htmlFor="repeat-interval">
              {t("recurring.interval", "Repeat every")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="repeat-interval"
                type="number"
                min={1}
                value={form.repeatInterval}
                onChange={(e) =>
                  dispatch({
                    type: "setRepeatInterval",
                    value: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {form.frequency === "weekly" && t("recurring.weeks", "weeks")}
                {form.frequency === "bi_weekly" && t("recurring.biweeks", "bi-weeks")}
                {form.frequency === "monthly" && t("recurring.months", "months")}
                {form.frequency === "quarterly" && t("recurring.quarters", "quarters")}
                {form.frequency === "yearly" && t("recurring.years", "years")}
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
              value={form.endDate}
              onChange={(e) => dispatch({ type: "setEndDate", value: e.target.value })}
            />
          </div>
        </div>
      </ResponsiveDialog.Content>

      <ResponsiveDialog.Footer>
        <Button
          variant="outline"
          onClick={() => {
            tap();
            onOpenChange(false);
          }}
          disabled={isUpdating}
          className="max-sm:w-full"
        >
          {t("common.cancel", "Cancel")}
        </Button>
        <Button
          onClick={() => {
            tap();
            void handleSave();
          }}
          disabled={isUpdating}
          className="max-sm:w-full"
        >
          {isUpdating
            ? t("common.saving", "Saving...")
            : t("common.save", "Save")}
        </Button>
      </ResponsiveDialog.Footer>
    </ResponsiveDialog>
  );
}
