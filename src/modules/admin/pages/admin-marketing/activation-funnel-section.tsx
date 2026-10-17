import { motion } from "framer-motion";
import { UsersIcon, ActivityIcon, RepeatIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/locale-utils";
import { themeIntentTones, type ThemeIntent } from "@/lib/theme-intents";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import { useActivationFunnel } from "./hooks";
import { PanelCard } from "./panel-card";

const STEP_META = [
  { key: "signups", labelKey: "retention.activationSignups", icon: UsersIcon, intent: "info" as ThemeIntent },
  { key: "first_expense", labelKey: "retention.activationFirstExpense", icon: ActivityIcon, intent: "brand" as ThemeIntent },
  { key: "active_7d", labelKey: "retention.activationActive7d", icon: RepeatIcon, intent: "success" as ThemeIntent },
] as const;

/** Funnel rows without a card wrapper, for embedding in a switcher card. */
export function ActivationFunnelSteps({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const { data, isLoading } = useActivationFunnel(enabled);

  const rates: Record<(typeof STEP_META)[number]["key"], number> = {
    signups: data ? 100 : 0,
    first_expense: data?.signup_to_expense_rate ?? 0,
    active_7d: data?.signup_to_active_rate ?? 0,
  };

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <p className="text-xs text-muted-foreground">
        {tAdmin("retention.activationCohort", { days: data?.cohort_days ?? 30 })}
      </p>
      {STEP_META.map((step, index) => {
        const Icon = step.icon;
        const tones = themeIntentTones[step.intent];
        const rate = rates[step.key];
        return (
          <div key={step.key} className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", tones.surface)}>
                <Icon className={cn("h-3.5 w-3.5", tones.icon)} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{tAdmin(step.labelKey)}</span>
              {isLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="tabular-nums text-muted-foreground">
                  {formatNumber(data?.[step.key] ?? 0)}
                  {index > 0 ? (
                    <span className="ml-2 font-semibold text-foreground">{rate}%</span>
                  ) : null}
                </span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full w-full origin-left rounded-full"
                style={{ backgroundColor: tones.chartColor }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: rate / 100 }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ActivationFunnelSection({ enabled, className }: { enabled: boolean; className?: string }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <PanelCard title={tAdmin("retention.activationFunnel")} className={className}>
      <ActivationFunnelSteps enabled={enabled} />
    </PanelCard>
  );
}
