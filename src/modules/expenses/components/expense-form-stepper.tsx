import { cn } from "@/lib/utils";

const EXPENSE_FORM_STEPS = [
  { key: "details", label: "Details" },
  { key: "participants", label: "People" },
  { key: "split", label: "Split" },
  { key: "review", label: "Review" },
] as const;

export type ExpenseFormStepKey = (typeof EXPENSE_FORM_STEPS)[number]["key"];

interface ExpenseFormStepperProps {
  activeStep: ExpenseFormStepKey;
  className?: string;
}

export function ExpenseFormStepper({ activeStep, className }: ExpenseFormStepperProps) {
  const activeIndex = EXPENSE_FORM_STEPS.findIndex((s) => s.key === activeStep);

  return (
    <nav
      aria-label="Expense form progress"
      className={cn("mb-4 flex items-center gap-1", className)}
    >
      {EXPENSE_FORM_STEPS.map((step, index) => {
        const isActive = step.key === activeStep;
        const isComplete = index < activeIndex;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isComplete && "bg-primary/20 text-primary",
                !isActive && !isComplete && "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

export { EXPENSE_FORM_STEPS };
