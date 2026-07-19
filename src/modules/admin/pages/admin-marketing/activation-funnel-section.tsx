import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  UsersIcon,
  ActivityIcon,
  RepeatIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { AdminMetricCard, AdminMetricGrid } from "../../components/AdminMetricCard";
import { useActivationFunnel } from "./hooks";

export function ActivationFunnelSection({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const { data, isLoading } = useActivationFunnel(enabled);
  const cards = useMemo(() => [0, 1, 2], []);
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(cards);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("retention.activationFunnel")}
        </p>
        <p className="text-xs text-muted-foreground">
          {tAdmin("retention.activationCohort", { days: data?.cohort_days ?? 30 })}
        </p>
      </div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={animationKey}
      >
        <AdminMetricGrid columns={3}>
          <motion.div variants={rowVariants} custom={0}>
            <AdminMetricCard
              icon={UsersIcon}
              label={tAdmin("retention.activationSignups")}
              value={formatNumber(data?.signups ?? 0)}
              loading={isLoading}
              intent="info"
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={1}>
            <AdminMetricCard
              icon={ActivityIcon}
              label={tAdmin("retention.activationFirstExpense")}
              value={formatNumber(data?.first_expense ?? 0)}
              loading={isLoading}
              intent="brand"
              description={
                data
                  ? tAdmin("retention.activationRate", { rate: data.signup_to_expense_rate })
                  : undefined
              }
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={2}>
            <AdminMetricCard
              icon={RepeatIcon}
              label={tAdmin("retention.activationActive7d")}
              value={formatNumber(data?.active_7d ?? 0)}
              loading={isLoading}
              intent="success"
              description={
                data
                  ? tAdmin("retention.activationRate", { rate: data.signup_to_active_rate })
                  : undefined
              }
            />
          </motion.div>
        </AdminMetricGrid>
      </motion.div>
    </div>
  );
}
