import { PlusCircle, Banknote, Users, UserPlus, ChevronRight } from "lucide-react";
import { useGo } from "@refinedev/core";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const actions = [
  { icon: PlusCircle, title: "Add Expense", desc: "Record a new shared expense", path: "/expenses/create" },
  { icon: Banknote, title: "Settle Up", desc: "Record a payment to settle debts", path: "/payments/create" },
  { icon: Users, title: "Create Group", desc: "Start a new expense group", path: "/groups/create" },
  { icon: UserPlus, title: "Invite Friend", desc: "Add friends to split with", path: "/friends" },
];

interface DashboardActionsListProps {
  disabled?: boolean;
}

export function DashboardActionsList({ disabled = false }: DashboardActionsListProps) {
  const go = useGo();

  const handleClick = (path: string) => {
    if (disabled) {
      go({ to: "/login" });
    } else {
      go({ to: path });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">Quick Actions</h3>
      <div className="grid gap-3">
        <TooltipProvider delayDuration={0}>
          {actions.map((action, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleClick(action.path)}
                  disabled={disabled}
                  className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-background border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none">{action.title}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{action.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </button>
              </TooltipTrigger>
              {disabled && (
                <TooltipContent side="right" className="font-medium text-xs">
                  Login to use this feature
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
