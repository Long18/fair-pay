import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Profile } from "@/modules/profile/types";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SPRING_GENTLE, ENTRANCE_Y } from "@/lib/animation";

export function DashboardHero() {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const firstName = identity?.full_name?.split(" ")[0] || "there";
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: ENTRANCE_Y * 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { ...SPRING_GENTLE, delay: 0.1 }}
    >
    <div className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-center">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t('dashboard.welcomeBack')}, {firstName}
          </h2>
          <p className="text-muted-foreground mt-1 text-base">
            {t('dashboard.balanceOverviewFor')} <span className="font-medium text-foreground">{t('dashboard.thisMonth')}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">
            {t('dashboard.viewContext')}
          </span>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px] bg-background shadow-sm">
              <SelectValue placeholder={t('dashboard.viewContext')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allContexts')}</SelectItem>
              <SelectItem value="personal">{t('dashboard.personal')}</SelectItem>
              <SelectItem value="work">{t('dashboard.workTrip')}</SelectItem>
              <SelectItem value="friends">{t('friends.title')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <picture className="hidden overflow-hidden rounded-lg border bg-card shadow-sm lg:block">
        <source
          srcSet="/assets/generated/dashboard-insights-visual.webp"
          type="image/webp"
        />
        <img
          src="/assets/generated/dashboard-insights-visual.png"
          alt=""
          width={1672}
          height={941}
          className="aspect-[16/9] h-full w-full object-cover"
          decoding="async"
          loading="lazy"
        />
      </picture>
    </div>
    </motion.div>
  );
}
